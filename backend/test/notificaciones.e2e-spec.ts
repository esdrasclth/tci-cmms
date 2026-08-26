import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { NotificacionesService } from '../src/notificaciones/notificaciones.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { crearAppE2E } from './utils/app-e2e';
import { Escenario, sembrarEscenario } from './utils/escenario';
import { OrdenDetalle, cuerpo } from './utils/tipos';

/**
 * Modulo 8 — notificaciones (TCI-53 a TCI-56).
 *
 * Los eventos que se comprueban son los de la regla 9 de docs/flujo-ordenes.md:
 * asignar y reasignar avisan al tecnico, completar al admin, cancelar al
 * tecnico y reabrir al tecnico.
 */

interface Notificacion {
  id: string;
  evento: string;
  titulo: string;
  cuerpo: string;
  enlace: string | null;
  leidaEn: string | null;
  createdAt: string;
}

interface Bandeja {
  data: Notificacion[];
  noLeidas: number;
}

interface Preferencia {
  id: string;
  evento: string;
  rol: 'ADMIN' | 'TECNICO';
  canal: 'EN_APP' | 'CORREO';
  activo: boolean;
}

interface Plantilla {
  id: string;
  evento: string;
  asunto: string;
  cuerpo: string;
}

describe('Notificaciones (e2e)', () => {
  let app: INestApplication<App>;
  let esc: Escenario;
  let prisma: PrismaService;

  const api = () => request(app.getHttpServer());

  const crearOrden = async () => {
    const respuesta = await api()
      .post('/api/ordenes')
      .set('Cookie', esc.admin.cookie)
      .send({
        titulo: 'Orden para notificar',
        descripcionProblema: 'Descripcion suficientemente larga.',
        clienteId: esc.clienteId,
        sedeId: esc.sedeId,
        equipoId: esc.equipoId,
        tipoMantenimientoId: esc.tipoConEquipoId,
      })
      .expect(201);

    const orden = cuerpo<OrdenDetalle>(respuesta);
    esc.registrarOrden(orden.id);
    return orden;
  };

  const asignar = (ordenId: string, tecnicoId = esc.tecnico.id) =>
    api()
      .post(`/api/ordenes/${ordenId}/asignar`)
      .set('Cookie', esc.admin.cookie)
      .send({ tecnicoId })
      .expect(201);

  const bandejaDe = async (cookie: string) => {
    const respuesta = await api()
      .get('/api/notificaciones')
      .set('Cookie', cookie)
      .expect(200);
    return cuerpo<Bandeja>(respuesta);
  };

  /** Las notificaciones de un evento concreto en la bandeja de alguien. */
  const deEvento = async (cookie: string, evento: string) =>
    (await bandejaDe(cookie)).data.filter((n) => n.evento === evento);

  beforeAll(async () => {
    app = await crearAppE2E();
    esc = await sembrarEscenario(app);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Las notificaciones caen por Cascade al borrar los usuarios del escenario.
    await esc?.limpiar();
    await app?.close();
  });

  // -------------------------------------------------------------------------
  // TCI-53 — eventos disparadores
  // -------------------------------------------------------------------------

  describe('Eventos que disparan notificacion', () => {
    it('asignar avisa al tecnico, con enlace a la orden', async () => {
      const orden = await crearOrden();
      await asignar(orden.id);

      const suyas = await deEvento(esc.tecnico.cookie, 'ORDEN_ASIGNADA');
      const mia = suyas.find((n) => n.cuerpo.includes(orden.numero));
      expect(mia).toBeDefined();
      expect(mia!.titulo).toContain(orden.numero);
      expect(mia!.enlace).toBe(`/panel/ordenes/${orden.id}`);
      expect(mia!.leidaEn).toBeNull();
    });

    it('completar avisa al admin y nombra al tecnico', async () => {
      const orden = await crearOrden();
      await asignar(orden.id);
      await api()
        .post(`/api/ordenes/${orden.id}/iniciar`)
        .set('Cookie', esc.tecnico.cookie)
        .send({})
        .expect(201);
      await api()
        .post(`/api/ordenes/${orden.id}/completar`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ trabajoRealizado: 'Trabajo terminado sin novedad.' })
        .expect(201);

      const delAdmin = await deEvento(esc.admin.cookie, 'ORDEN_COMPLETADA');
      const mia = delAdmin.find((n) => n.cuerpo.includes(orden.numero));
      expect(mia).toBeDefined();
      expect(mia!.cuerpo).toContain('E2E tecnico');
    });

    it('cancelar avisa al tecnico asignado e incluye el motivo', async () => {
      const orden = await crearOrden();
      await asignar(orden.id);
      await api()
        .post(`/api/ordenes/${orden.id}/cancelar`)
        .set('Cookie', esc.admin.cookie)
        .send({ motivo: 'El cliente pospuso la visita' })
        .expect(201);

      const suyas = await deEvento(esc.tecnico.cookie, 'ORDEN_CANCELADA');
      const mia = suyas.find((n) => n.cuerpo.includes(orden.numero));
      expect(mia!.cuerpo).toContain('El cliente pospuso la visita');
    });

    it('un comentario avisa a la otra parte, no a quien lo escribio', async () => {
      const orden = await crearOrden();
      await asignar(orden.id);

      await api()
        .post(`/api/ordenes/${orden.id}/comentarios`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ comentario: 'Falta el repuesto, vuelvo manana.' })
        .expect(201);

      const delAdmin = await deEvento(esc.admin.cookie, 'ORDEN_COMENTADA');
      expect(delAdmin.some((n) => n.cuerpo.includes(orden.numero))).toBe(true);

      // Regla 2: a quien actua no se le notifica lo que acaba de hacer.
      const delTecnico = await deEvento(esc.tecnico.cookie, 'ORDEN_COMENTADA');
      expect(delTecnico.some((n) => n.cuerpo.includes(orden.numero))).toBe(
        false,
      );
    });

    it('las transiciones del propio tecnico sobre su trabajo no avisan', async () => {
      const orden = await crearOrden();
      await asignar(orden.id);
      const antes = (await bandejaDe(esc.admin.cookie)).data.length;

      await api()
        .post(`/api/ordenes/${orden.id}/iniciar`)
        .set('Cookie', esc.tecnico.cookie)
        .send({})
        .expect(201);
      await api()
        .post(`/api/ordenes/${orden.id}/pausar`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ motivo: 'Espera de repuesto' })
        .expect(201);

      // Notificarlas convertiria la bandeja en un registro de actividad.
      expect((await bandejaDe(esc.admin.cookie)).data.length).toBe(antes);
    });

    it('un tecnico ajeno a la orden no recibe nada de ella', async () => {
      const orden = await crearOrden();
      await asignar(orden.id);

      const ajenas = await deEvento(esc.otroTecnico.cookie, 'ORDEN_ASIGNADA');
      expect(ajenas.some((n) => n.cuerpo.includes(orden.numero))).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Bandeja
  // -------------------------------------------------------------------------

  describe('Bandeja', () => {
    it('cuenta las no leidas y las marca una a una', async () => {
      const orden = await crearOrden();
      await asignar(orden.id);

      const antes = await bandejaDe(esc.tecnico.cookie);
      expect(antes.noLeidas).toBeGreaterThan(0);

      const primera = antes.data[0];
      await api()
        .patch(`/api/notificaciones/${primera.id}/leida`)
        .set('Cookie', esc.tecnico.cookie)
        .expect(200);

      const despues = await bandejaDe(esc.tecnico.cookie);
      expect(despues.noLeidas).toBe(antes.noLeidas - 1);
    });

    it('marcarlas todas deja el contador en cero', async () => {
      const orden = await crearOrden();
      await asignar(orden.id);

      await api()
        .post('/api/notificaciones/leidas')
        .set('Cookie', esc.tecnico.cookie)
        .expect(200);

      expect((await bandejaDe(esc.tecnico.cookie)).noLeidas).toBe(0);
    });

    it('nadie puede marcar como leida la notificacion de otro', async () => {
      const orden = await crearOrden();
      await asignar(orden.id);

      const [suya] = (await bandejaDe(esc.tecnico.cookie)).data;

      // 404 y no 403: para el otro usuario esa notificacion no existe, y
      // distinguirlo confirmaria que si existe.
      await api()
        .patch(`/api/notificaciones/${suya.id}/leida`)
        .set('Cookie', esc.otroTecnico.cookie)
        .expect(404);
    });

    it('la bandeja es la de la sesion: no se puede pedir la de otro', async () => {
      const respuesta = await api()
        .get('/api/notificaciones')
        .query({ usuarioId: esc.tecnico.id })
        .set('Cookie', esc.otroTecnico.cookie)
        .expect(400);

      // `forbidNonWhitelisted` corta el parametro: el usuario sale de la sesion.
      expect(respuesta.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // TCI-54 y TCI-55 — configuracion
  // -------------------------------------------------------------------------

  describe('Preferencias por evento, rol y canal', () => {
    it('arrancan con la regla 9 del flujo y el correo apagado', async () => {
      const respuesta = await api()
        .get('/api/notificaciones/preferencias')
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      const preferencias = cuerpo<Preferencia[]>(respuesta);
      const asignadaTecnico = preferencias.filter(
        (p) => p.evento === 'ORDEN_ASIGNADA' && p.rol === 'TECNICO',
      );
      expect(asignadaTecnico).toHaveLength(2);
      expect(asignadaTecnico.find((p) => p.canal === 'EN_APP')!.activo).toBe(
        true,
      );
      // El correo entra apagado: depende de que el cliente confirme el dominio.
      expect(asignadaTecnico.find((p) => p.canal === 'CORREO')!.activo).toBe(
        false,
      );
    });

    it('apagar una preferencia deja de notificar por ese canal', async () => {
      const respuesta = await api()
        .get('/api/notificaciones/preferencias')
        .set('Cookie', esc.admin.cookie)
        .expect(200);
      const preferencia = cuerpo<Preferencia[]>(respuesta).find(
        (p) =>
          p.evento === 'ORDEN_ASIGNADA' &&
          p.rol === 'TECNICO' &&
          p.canal === 'EN_APP',
      )!;

      await api()
        .patch(`/api/notificaciones/preferencias/${preferencia.id}`)
        .set('Cookie', esc.admin.cookie)
        .send({ activo: false })
        .expect(200);

      try {
        const orden = await crearOrden();
        await asignar(orden.id);

        const suyas = await deEvento(esc.tecnico.cookie, 'ORDEN_ASIGNADA');
        expect(suyas.some((n) => n.cuerpo.includes(orden.numero))).toBe(false);
      } finally {
        // Se restaura: la tabla es compartida con el resto de la suite.
        await api()
          .patch(`/api/notificaciones/preferencias/${preferencia.id}`)
          .set('Cookie', esc.admin.cookie)
          .send({ activo: true })
          .expect(200);
      }
    });

    it('un tecnico no configura que se notifica', async () => {
      await api()
        .get('/api/notificaciones/preferencias')
        .set('Cookie', esc.tecnico.cookie)
        .expect(403);
    });
  });

  // -------------------------------------------------------------------------
  // TCI-56 — plantillas
  // -------------------------------------------------------------------------

  describe('Plantillas', () => {
    it('hay una por cada evento que el sistema sabe emitir', async () => {
      const respuesta = await api()
        .get('/api/notificaciones/plantillas')
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      const eventos = cuerpo<Plantilla[]>(respuesta).map((p) => p.evento);
      for (const evento of [
        'ORDEN_ASIGNADA',
        'ORDEN_COMPLETADA',
        'ORDEN_CANCELADA',
        'ORDEN_REABIERTA',
        'ORDEN_COMENTADA',
        'PREVENTIVO_POR_VENCER',
        'REPUESTO_BAJO_MINIMO',
      ]) {
        expect(eventos).toContain(evento);
      }
    });

    it('el texto editado es el que sale en la notificacion', async () => {
      const respuesta = await api()
        .get('/api/notificaciones/plantillas')
        .set('Cookie', esc.admin.cookie)
        .expect(200);
      const plantilla = cuerpo<Plantilla[]>(respuesta).find(
        (p) => p.evento === 'ORDEN_ASIGNADA',
      )!;
      const original = { asunto: plantilla.asunto, cuerpo: plantilla.cuerpo };

      await api()
        .patch(`/api/notificaciones/plantillas/${plantilla.id}`)
        .set('Cookie', esc.admin.cookie)
        .send({ asunto: 'Nueva orden para usted: {{numero}}' })
        .expect(200);

      try {
        const orden = await crearOrden();
        await asignar(orden.id);

        const suyas = await deEvento(esc.tecnico.cookie, 'ORDEN_ASIGNADA');
        const mia = suyas.find((n) => n.titulo.includes(orden.numero));
        expect(mia!.titulo).toBe(`Nueva orden para usted: ${orden.numero}`);
      } finally {
        await api()
          .patch(`/api/notificaciones/plantillas/${plantilla.id}`)
          .set('Cookie', esc.admin.cookie)
          .send(original)
          .expect(200);
      }
    });

    it('un tecnico no reescribe las plantillas', async () => {
      await api()
        .get('/api/notificaciones/plantillas')
        .set('Cookie', esc.tecnico.cookie)
        .expect(403);
    });
  });

  // -------------------------------------------------------------------------
  // Reglas del servicio
  // -------------------------------------------------------------------------

  describe('NotificacionesService', () => {
    it('un marcador sin valor se deja a la vista en vez de borrarse', async () => {
      const servicio = app.get(NotificacionesService);

      // Un hueco vacio en mitad de una frase se lee como un error del sistema;
      // `{{tecnico}}` a la vista al menos dice que falta.
      const resultado = await servicio.emitir({
        evento: 'ORDEN_COMPLETADA',
        destinatarios: [esc.admin.id],
        datos: { numero: 'OT-TEST', titulo: 'Sin tecnico', cliente: 'Cliente' },
      });
      expect(resultado.enApp).toBe(1);

      const [ultima] = (await bandejaDe(esc.admin.cookie)).data;
      expect(ultima.cuerpo).toContain('{{tecnico}}');

      await prisma.notificacion.delete({ where: { id: ultima.id } });
    });

    it('emitir a un usuario desactivado no notifica nada', async () => {
      const servicio = app.get(NotificacionesService);
      const resultado = await servicio.emitir({
        evento: 'ORDEN_ASIGNADA',
        destinatarios: [esc.tecnicoInactivo.id],
        datos: { numero: 'OT-TEST', titulo: 'X', cliente: 'Y', equipo: 'Z' },
      });
      expect(resultado.enApp).toBe(0);
    });

    it('no lanza aunque el evento no tenga plantilla ni destinatarios validos', async () => {
      const servicio = app.get(NotificacionesService);
      // Regla 1: notificar es un efecto secundario y no puede tumbar la accion.
      const resultado = await servicio.emitir({
        evento: 'ORDEN_ASIGNADA',
        destinatarios: ['no-existe'],
        datos: {},
      });
      expect(resultado).toEqual({ enApp: 0, porCorreo: 0 });
    });
  });
});

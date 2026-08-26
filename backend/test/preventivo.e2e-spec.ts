import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { UnidadFrecuencia } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma/prisma.service';
import { sumarFrecuencia } from '../src/preventivo/preventivo.service';
import { crearAppE2E } from './utils/app-e2e';
import { Escenario, sembrarEscenario } from './utils/escenario';
import { ErrorHttp, cuerpo } from './utils/tipos';

/**
 * Modulo 7 — planes de mantenimiento preventivo (TCI-49).
 *
 * El generador de ordenes es TCI-50 y no existe todavia, asi que aqui se
 * comprueba la definicion del plan y el calculo de a quien alcanza y cuando le
 * toca, que es lo que esa tarea leera.
 */

interface TipoEquipo {
  id: string;
  nombre: string;
  activo: boolean;
  createdAt: string;
}

interface TipoEquipoAdmin extends TipoEquipo {
  equipos: number;
  planes: number;
}

interface Plan {
  id: string;
  nombre: string;
  frecuenciaValor: number;
  frecuenciaUnidad: UnidadFrecuencia;
  diasAnticipacion: number;
  prioridad: string;
  activo: boolean;
  tipoEquipo: { id: string; nombre: string };
  cliente: { id: string; nombre: string } | null;
  tipoMantenimiento: { id: string; nombre: string };
}

interface PlanListado extends Plan {
  equipos: number;
}

interface EquipoDelPlan {
  id: string;
  codigo: string;
  ultimoPreventivo: { id: string; numero: string; fecha: string } | null;
  proximoVencimiento: string | null;
  vencido: boolean;
  porVencer: boolean;
}

interface Generacion {
  ejecutado: boolean;
  planes: number;
  creadas: { plan: string; equipo: string; numero: string }[];
  omitidas: { plan: string; equipo: string; motivo: string }[];
}

describe('Mantenimiento preventivo (e2e)', () => {
  let app: INestApplication<App>;
  let esc: Escenario;
  let prisma: PrismaService;

  const api = () => request(app.getHttpServer());
  const tiposCreados: string[] = [];
  const planesCreados: string[] = [];

  const sufijo = () => Math.random().toString(36).slice(2, 8);

  /**
   * Las ordenes que crea el generador no pasan por `esc.registrarOrden`, asi
   * que hay que apuntarlas a mano o quedarian huerfanas al limpiar.
   */
  const registrarOrdenGenerada = (id: string) => esc.registrarOrden(id);

  const registrarPorNumero = async (numero: string) => {
    const orden = await prisma.ordenTrabajo.findFirst({
      where: { numero },
      select: { id: true },
    });
    if (orden) esc.registrarOrden(orden.id);
  };

  const crearTipoEquipo = async (nombre = `E2E Tipo ${sufijo()}`) => {
    const respuesta = await api()
      .post('/api/tipos-equipo')
      .set('Cookie', esc.admin.cookie)
      .send({ nombre })
      .expect(201);

    const tipo = cuerpo<TipoEquipo>(respuesta);
    tiposCreados.push(tipo.id);
    return tipo;
  };

  const crearPlan = async (
    tipoEquipoId: string,
    extra: Record<string, unknown> = {},
  ) => {
    const respuesta = await api()
      .post('/api/planes-mantenimiento')
      .set('Cookie', esc.admin.cookie)
      .send({
        nombre: `Plan ${sufijo()}`,
        tipoEquipoId,
        tipoMantenimientoId: esc.tipoSinEquipoId,
        frecuenciaValor: 3,
        frecuenciaUnidad: 'MESES',
        ...extra,
      })
      .expect(201);

    const plan = cuerpo<Plan>(respuesta);
    planesCreados.push(plan.id);
    return plan;
  };

  /** Pone el equipo del escenario bajo el tipo indicado. */
  const asignarTipo = (tipoEquipoId: string) =>
    api()
      .patch(`/api/equipos/${esc.equipoId}`)
      .set('Cookie', esc.admin.cookie)
      .send({ tipoEquipoId })
      .expect(200);

  beforeAll(async () => {
    app = await crearAppE2E();
    esc = await sembrarEscenario(app);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.planMantenimiento.deleteMany({
      where: { id: { in: planesCreados } },
    });
    // Antes del escenario: el equipo apunta al tipo con FK Restrict.
    await prisma.equipo.updateMany({
      where: { tipoEquipoId: { in: tiposCreados } },
      data: { tipoEquipoId: null },
    });
    await esc?.limpiar();
    await prisma.tipoEquipo.deleteMany({ where: { id: { in: tiposCreados } } });
    await app?.close();
  });

  // -------------------------------------------------------------------------
  // Catalogo de tipos de equipo
  // -------------------------------------------------------------------------

  describe('Catalogo de tipos de equipo', () => {
    it('un tecnico lee los activos: los necesita al dar de alta un equipo', async () => {
      await crearTipoEquipo();
      await api()
        .get('/api/tipos-equipo')
        .set('Cookie', esc.tecnico.cookie)
        .expect(200);
    });

    it('un tecnico no ve el catalogo de administracion ni escribe en el', async () => {
      await api()
        .get('/api/tipos-equipo/admin')
        .set('Cookie', esc.tecnico.cookie)
        .expect(403);

      await api()
        .post('/api/tipos-equipo')
        .set('Cookie', esc.tecnico.cookie)
        .send({ nombre: 'Intento' })
        .expect(403);
    });

    it('rechaza un nombre repetido aunque cambie la caja', async () => {
      const tipo = await crearTipoEquipo(`E2E Bomba ${sufijo()}`);

      const respuesta = await api()
        .post('/api/tipos-equipo')
        .set('Cookie', esc.admin.cookie)
        .send({ nombre: tipo.nombre.toUpperCase() })
        .expect(422);

      // Dos "Compresor" partirian en dos el plan que cuelga del tipo.
      expect(cuerpo<ErrorHttp>(respuesta).message).toContain(tipo.nombre);
    });

    it('cuenta cuantos equipos y planes lo usan', async () => {
      const tipo = await crearTipoEquipo();
      await asignarTipo(tipo.id);
      await crearPlan(tipo.id);

      const respuesta = await api()
        .get('/api/tipos-equipo/admin')
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      const fila = cuerpo<TipoEquipoAdmin[]>(respuesta).find(
        (t) => t.id === tipo.id,
      );
      expect(fila!.equipos).toBe(1);
      expect(fila!.planes).toBe(1);
    });

    it('no deja borrar un tipo que algun equipo usa', async () => {
      const tipo = await crearTipoEquipo();
      await asignarTipo(tipo.id);

      const respuesta = await api()
        .delete(`/api/tipos-equipo/${tipo.id}`)
        .set('Cookie', esc.admin.cookie)
        .expect(422);

      expect(cuerpo<ErrorHttp>(respuesta).message).toContain('Desactivelo');
    });
  });

  // -------------------------------------------------------------------------
  // TCI-49 — planes
  // -------------------------------------------------------------------------

  describe('Planes de mantenimiento', () => {
    it('el admin lo crea con su frecuencia y sus valores por defecto', async () => {
      const tipo = await crearTipoEquipo();
      const plan = await crearPlan(tipo.id);

      expect(plan.frecuenciaValor).toBe(3);
      expect(plan.frecuenciaUnidad).toBe('MESES');
      expect(plan.diasAnticipacion).toBe(7);
      expect(plan.prioridad).toBe('MEDIA');
      expect(plan.cliente).toBeNull();
      expect(plan.activo).toBe(true);
    });

    it('un tecnico no planifica: es decision de la gerencia', async () => {
      await api()
        .get('/api/planes-mantenimiento')
        .set('Cookie', esc.tecnico.cookie)
        .expect(403);
    });

    it('dice a cuantos equipos alcanza', async () => {
      const tipo = await crearTipoEquipo();
      await asignarTipo(tipo.id);
      const plan = await crearPlan(tipo.id);

      const respuesta = await api()
        .get('/api/planes-mantenimiento')
        .query({ tipoEquipoId: tipo.id })
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      const fila = cuerpo<PlanListado[]>(respuesta).find(
        (p) => p.id === plan.id,
      );
      expect(fila!.equipos).toBe(1);
    });

    it('acotado a un cliente, no alcanza a los equipos de otro', async () => {
      const tipo = await crearTipoEquipo();
      await asignarTipo(tipo.id);
      const plan = await crearPlan(tipo.id, {
        clienteId: esc.otroClienteId,
      });

      const respuesta = await api()
        .get(`/api/planes-mantenimiento/${plan.id}/equipos`)
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      expect(cuerpo<{ equipos: EquipoDelPlan[] }>(respuesta).equipos).toEqual(
        [],
      );
    });

    it('un equipo sin preventivo previo sale vencido: nunca se le ha hecho', async () => {
      const tipo = await crearTipoEquipo();
      await asignarTipo(tipo.id);
      const plan = await crearPlan(tipo.id);

      const respuesta = await api()
        .get(`/api/planes-mantenimiento/${plan.id}/equipos`)
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      const [equipo] = cuerpo<{ equipos: EquipoDelPlan[] }>(respuesta).equipos;
      expect(equipo.id).toBe(esc.equipoId);
      expect(equipo.ultimoPreventivo).toBeNull();
      expect(equipo.proximoVencimiento).toBeNull();
      expect(equipo.vencido).toBe(true);
    });

    it('rechaza un tipo de equipo desactivado', async () => {
      const tipo = await crearTipoEquipo();
      await api()
        .patch(`/api/tipos-equipo/${tipo.id}`)
        .set('Cookie', esc.admin.cookie)
        .send({ activo: false })
        .expect(200);

      const respuesta = await api()
        .post('/api/planes-mantenimiento')
        .set('Cookie', esc.admin.cookie)
        .send({
          nombre: 'Plan sobre tipo retirado',
          tipoEquipoId: tipo.id,
          tipoMantenimientoId: esc.tipoSinEquipoId,
          frecuenciaValor: 1,
          frecuenciaUnidad: 'MESES',
        })
        .expect(422);

      expect(cuerpo<ErrorHttp>(respuesta).message).toContain('desactivado');
    });

    it('no deja cambiar el tipo de equipo de un plan existente', async () => {
      const tipo = await crearTipoEquipo();
      const otro = await crearTipoEquipo();
      const plan = await crearPlan(tipo.id);

      // `forbidNonWhitelisted`: el campo no esta en el DTO de edicion porque
      // cambiarlo convertiria el plan en otro distinto.
      await api()
        .patch(`/api/planes-mantenimiento/${plan.id}`)
        .set('Cookie', esc.admin.cookie)
        .send({ tipoEquipoId: otro.id })
        .expect(400);
    });

    it('rechaza una frecuencia de cero', async () => {
      const tipo = await crearTipoEquipo();
      await api()
        .post('/api/planes-mantenimiento')
        .set('Cookie', esc.admin.cookie)
        .send({
          nombre: 'Plan sin frecuencia',
          tipoEquipoId: tipo.id,
          tipoMantenimientoId: esc.tipoSinEquipoId,
          frecuenciaValor: 0,
          frecuenciaUnidad: 'DIAS',
        })
        .expect(400);
    });
  });

  // -------------------------------------------------------------------------
  // TCI-50 — generacion automatica
  // -------------------------------------------------------------------------

  describe('Generacion automatica de ordenes', () => {
    /** Ejecuta el generador para un plan y devuelve el resultado. */
    const generar = async (planId: string) => {
      const respuesta = await api()
        .post(`/api/planes-mantenimiento/${planId}/generar`)
        .set('Cookie', esc.admin.cookie)
        .expect(200);
      return cuerpo<Generacion>(respuesta);
    };

    it('crea una orden por cada equipo vencido', async () => {
      const tipo = await crearTipoEquipo();
      await asignarTipo(tipo.id);
      const plan = await crearPlan(tipo.id, {
        instrucciones: 'Cambio de filtros y revision de correas',
      });

      const resultado = await generar(plan.id);

      expect(resultado.ejecutado).toBe(true);
      expect(resultado.creadas).toHaveLength(1);
      expect(resultado.creadas[0].equipo).toBeTruthy();

      const numero = resultado.creadas[0].numero;
      const orden = await prisma.ordenTrabajo.findFirst({
        where: { numero },
        select: {
          id: true,
          origen: true,
          planId: true,
          equipoId: true,
          prioridad: true,
          descripcionProblema: true,
          estado: true,
        },
      });
      registrarOrdenGenerada(orden!.id);

      expect(orden!.origen).toBe('PREVENTIVO_AUTOMATICO');
      expect(orden!.planId).toBe(plan.id);
      expect(orden!.equipoId).toBe(esc.equipoId);
      expect(orden!.estado).toBe('PENDIENTE');
      // Las instrucciones del plan son la descripcion de la orden.
      expect(orden!.descripcionProblema).toContain('Cambio de filtros');
    });

    it('no duplica: la segunda pasada omite lo que ya tiene orden abierta', async () => {
      const tipo = await crearTipoEquipo();
      await asignarTipo(tipo.id);
      const plan = await crearPlan(tipo.id);

      const primera = await generar(plan.id);
      expect(primera.creadas).toHaveLength(1);
      await registrarPorNumero(primera.creadas[0].numero);

      // Sin esta regla un plan vencido crearia una orden cada dia.
      const segunda = await generar(plan.id);
      expect(segunda.creadas).toHaveLength(0);
      expect(segunda.omitidas).toHaveLength(1);
      expect(segunda.omitidas[0].motivo).toContain('abierta');
    });

    it('un plan desactivado no genera nada', async () => {
      const tipo = await crearTipoEquipo();
      await asignarTipo(tipo.id);
      const plan = await crearPlan(tipo.id);

      await api()
        .patch(`/api/planes-mantenimiento/${plan.id}`)
        .set('Cookie', esc.admin.cookie)
        .send({ activo: false })
        .expect(200);

      const resultado = await generar(plan.id);
      expect(resultado.planes).toBe(0);
      expect(resultado.creadas).toHaveLength(0);
    });

    it('la orden generada la atribuye al usuario de sistema, que no puede entrar', async () => {
      const tipo = await crearTipoEquipo();
      await asignarTipo(tipo.id);
      const plan = await crearPlan(tipo.id);

      const resultado = await generar(plan.id);
      await registrarPorNumero(resultado.creadas[0].numero);

      const orden = await prisma.ordenTrabajo.findFirst({
        where: { numero: resultado.creadas[0].numero },
        select: { creadoPor: { select: { email: true, activo: true } } },
      });

      expect(orden!.creadoPor.activo).toBe(false);
      // Sin fila en `accounts` no hay contrasena que verificar: no hay forma
      // de iniciar sesion con el.
      const cuentas = await prisma.account.count({
        where: { user: { email: orden!.creadoPor.email } },
      });
      expect(cuentas).toBe(0);
    });

    it('un tecnico no puede dispararla', async () => {
      await api()
        .post('/api/planes-mantenimiento/generar')
        .set('Cookie', esc.tecnico.cookie)
        .expect(403);
    });
  });

  // -------------------------------------------------------------------------
  // Calculo de la frecuencia
  // -------------------------------------------------------------------------

  describe('sumarFrecuencia', () => {
    it('suma dias y semanas', () => {
      const base = new Date('2026-03-10T12:00:00Z');
      expect(sumarFrecuencia(base, 5, UnidadFrecuencia.DIAS).getDate()).toBe(
        15,
      );
      expect(sumarFrecuencia(base, 2, UnidadFrecuencia.SEMANAS).getDate()).toBe(
        24,
      );
    });

    it('suma meses como meses, no como 30 dias', () => {
      const base = new Date(2026, 0, 15);
      const tres = sumarFrecuencia(base, 3, UnidadFrecuencia.MESES);
      expect(tres.getMonth()).toBe(3); // abril
      expect(tres.getDate()).toBe(15);
    });

    it('recorta al ultimo dia valido cuando el destino es mas corto', () => {
      // 31 de enero + 1 mes no puede ser el 31 de febrero.
      const base = new Date(2026, 0, 31);
      const siguiente = sumarFrecuencia(base, 1, UnidadFrecuencia.MESES);
      expect(siguiente.getMonth()).toBe(1); // febrero
      expect(siguiente.getDate()).toBe(28);
    });
  });
});

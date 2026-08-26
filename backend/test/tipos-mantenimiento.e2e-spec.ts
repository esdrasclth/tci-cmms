import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { PrismaService } from '../src/prisma/prisma.service';
import { crearAppE2E } from './utils/app-e2e';
import { Escenario, sembrarEscenario } from './utils/escenario';
import { ErrorHttp, cuerpo } from './utils/tipos';

interface Tipo {
  id: string;
  codigo: string;
  nombre: string;
  color: string | null;
  requiereEquipo: boolean;
  activo: boolean;
  createdAt: string;
}

interface TipoAdmin extends Tipo {
  ordenes: number;
}

/**
 * TCI-30 — catalogo editable de tipos de mantenimiento.
 *
 * Hasta ahora los tipos solo se leian y salian del seed. Estos tests cubren la
 * escritura, el reparto de permisos y la regla que impide borrar un tipo que ya
 * forma parte del historial de alguna orden.
 */
describe('Tipos de mantenimiento (e2e)', () => {
  let app: INestApplication<App>;
  let esc: Escenario;
  let prisma: PrismaService;

  const api = () => request(app.getHttpServer());
  const creados: string[] = [];

  /** Codigo unico por corrida: la tabla se comparte con el seed. */
  const codigo = (base: string) =>
    `${base}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

  const crearTipo = async (extra: Record<string, unknown> = {}) => {
    const respuesta = await api()
      .post('/api/tipos-mantenimiento')
      .set('Cookie', esc.admin.cookie)
      .send({ codigo: codigo('E2E'), nombre: 'Tipo de prueba', ...extra })
      .expect(201);

    const tipo = cuerpo<Tipo>(respuesta);
    creados.push(tipo.id);
    return tipo;
  };

  beforeAll(async () => {
    app = await crearAppE2E();
    esc = await sembrarEscenario(app);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // El escenario va primero: las ordenes son `Restrict` contra el tipo, asi
    // que un tipo usado por una orden no se puede borrar hasta que ella cae.
    await esc?.limpiar();
    await prisma.tipoMantenimiento.deleteMany({
      where: { id: { in: creados } },
    });
    await app?.close();
  });

  // -------------------------------------------------------------------------
  // Lectura
  // -------------------------------------------------------------------------

  describe('GET /api/tipos-mantenimiento', () => {
    it('un tecnico puede leer el catalogo: lo necesita para crear una orden', async () => {
      const respuesta = await api()
        .get('/api/tipos-mantenimiento')
        .set('Cookie', esc.tecnico.cookie)
        .expect(200);

      const tipos = cuerpo<Tipo[]>(respuesta);
      expect(tipos.length).toBeGreaterThan(0);
      expect(tipos[0]).toHaveProperty('requiereEquipo');
    });

    it('no ofrece los tipos desactivados', async () => {
      const respuesta = await api()
        .get('/api/tipos-mantenimiento')
        .set('Cookie', esc.tecnico.cookie)
        .expect(200);

      // El escenario siembra uno inactivo justamente para esto: si el
      // formulario lo ofreciera, el alta fallaria con un 422 incomprensible.
      expect(cuerpo<Tipo[]>(respuesta).map((t) => t.id)).not.toContain(
        esc.tipoInactivoId,
      );
    });

    it('401 sin sesion', async () => {
      await api().get('/api/tipos-mantenimiento').expect(401);
    });
  });

  describe('GET /api/tipos-mantenimiento/admin', () => {
    it('el admin ve tambien los inactivos y cuantas ordenes usan cada tipo', async () => {
      const respuesta = await api()
        .get('/api/tipos-mantenimiento/admin')
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      const tipos = cuerpo<TipoAdmin[]>(respuesta);
      expect(tipos.map((t) => t.id)).toContain(esc.tipoInactivoId);
      expect(tipos[0]).toHaveProperty('ordenes');
      expect(typeof tipos[0].ordenes).toBe('number');
    });

    it('403 para un tecnico: los inactivos no se le exponen', async () => {
      await api()
        .get('/api/tipos-mantenimiento/admin')
        .set('Cookie', esc.tecnico.cookie)
        .expect(403);
    });

    it('filtra por texto sobre codigo y nombre', async () => {
      const tipo = await crearTipo({ nombre: 'Termografia infrarroja' });

      const respuesta = await api()
        .get('/api/tipos-mantenimiento/admin')
        .query({ q: 'termografia infrarroja' })
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      expect(cuerpo<TipoAdmin[]>(respuesta).map((t) => t.id)).toContain(
        tipo.id,
      );
    });
  });

  // -------------------------------------------------------------------------
  // Alta
  // -------------------------------------------------------------------------

  describe('POST /api/tipos-mantenimiento', () => {
    it('el admin crea un tipo', async () => {
      const tipo = await crearTipo({
        nombre: 'Calibracion de instrumentos',
        color: '#1565C0',
        requiereEquipo: true,
      });

      expect(tipo.nombre).toBe('Calibracion de instrumentos');
      expect(tipo.color).toBe('#1565C0');
      expect(tipo.requiereEquipo).toBe(true);
      expect(tipo.activo).toBe(true);
    });

    it('normaliza el codigo a mayusculas', async () => {
      const minusculas = codigo('e2e').toLowerCase();

      const respuesta = await api()
        .post('/api/tipos-mantenimiento')
        .set('Cookie', esc.admin.cookie)
        .send({ codigo: `  ${minusculas}  `, nombre: 'Con espacios' })
        .expect(201);

      const tipo = cuerpo<Tipo>(respuesta);
      creados.push(tipo.id);
      expect(tipo.codigo).toBe(minusculas.toUpperCase());
    });

    it('`requiereEquipo` es false por defecto', async () => {
      expect((await crearTipo()).requiereEquipo).toBe(false);
    });

    it('422 si el codigo ya existe, con el nombre de quien lo ocupa', async () => {
      const existente = await crearTipo({ nombre: 'El primero' });

      const respuesta = await api()
        .post('/api/tipos-mantenimiento')
        .set('Cookie', esc.admin.cookie)
        .send({ codigo: existente.codigo, nombre: 'El segundo' })
        .expect(422);

      expect(cuerpo<ErrorHttp>(respuesta).message).toContain('El primero');
    });

    it('400 si el codigo trae espacios o tildes', async () => {
      for (const malo of ['CON ESPACIO', 'TILDÉ', 'A', 'DEMASIADO-LARGO-YA']) {
        await api()
          .post('/api/tipos-mantenimiento')
          .set('Cookie', esc.admin.cookie)
          .send({ codigo: malo, nombre: 'Nombre valido' })
          .expect(400);
      }
    });

    it('400 si el color no es hexadecimal', async () => {
      await api()
        .post('/api/tipos-mantenimiento')
        .set('Cookie', esc.admin.cookie)
        .send({ codigo: codigo('E2E'), nombre: 'Color malo', color: 'rojo' })
        .expect(400);
    });

    it('403 si lo intenta un tecnico', async () => {
      await api()
        .post('/api/tipos-mantenimiento')
        .set('Cookie', esc.tecnico.cookie)
        .send({ codigo: codigo('E2E'), nombre: 'Del tecnico' })
        .expect(403);
    });
  });

  // -------------------------------------------------------------------------
  // Edicion
  // -------------------------------------------------------------------------

  describe('PATCH /api/tipos-mantenimiento/:id', () => {
    it('el admin edita nombre, color y requiereEquipo', async () => {
      const tipo = await crearTipo();

      const respuesta = await api()
        .patch(`/api/tipos-mantenimiento/${tipo.id}`)
        .set('Cookie', esc.admin.cookie)
        .send({
          nombre: 'Nombre corregido',
          color: '#EF6C00',
          requiereEquipo: true,
        })
        .expect(200);

      expect(cuerpo<Tipo>(respuesta)).toMatchObject({
        nombre: 'Nombre corregido',
        color: '#EF6C00',
        requiereEquipo: true,
      });
    });

    it('desactivar lo saca del formulario de alta pero no lo borra', async () => {
      const tipo = await crearTipo();

      await api()
        .patch(`/api/tipos-mantenimiento/${tipo.id}`)
        .set('Cookie', esc.admin.cookie)
        .send({ activo: false })
        .expect(200);

      const paraElFormulario = await api()
        .get('/api/tipos-mantenimiento')
        .set('Cookie', esc.admin.cookie)
        .expect(200);
      expect(cuerpo<Tipo[]>(paraElFormulario).map((t) => t.id)).not.toContain(
        tipo.id,
      );

      const paraElAdmin = await api()
        .get('/api/tipos-mantenimiento/admin')
        .set('Cookie', esc.admin.cookie)
        .expect(200);
      expect(cuerpo<TipoAdmin[]>(paraElAdmin).map((t) => t.id)).toContain(
        tipo.id,
      );
    });

    it('deja liberado el codigo anterior al cambiarlo', async () => {
      const tipo = await crearTipo();
      const anterior = tipo.codigo;
      const nuevo = codigo('E2E');

      await api()
        .patch(`/api/tipos-mantenimiento/${tipo.id}`)
        .set('Cookie', esc.admin.cookie)
        .send({ codigo: nuevo })
        .expect(200);

      // El codigo que solto tiene que quedar disponible.
      const otro = await api()
        .post('/api/tipos-mantenimiento')
        .set('Cookie', esc.admin.cookie)
        .send({ codigo: anterior, nombre: 'Reutiliza el codigo' })
        .expect(201);
      creados.push(cuerpo<Tipo>(otro).id);
    });

    it('guardar el mismo codigo no choca consigo mismo', async () => {
      const tipo = await crearTipo();

      await api()
        .patch(`/api/tipos-mantenimiento/${tipo.id}`)
        .set('Cookie', esc.admin.cookie)
        .send({ codigo: tipo.codigo, nombre: 'Solo cambia el nombre' })
        .expect(200);
    });

    it('422 si el codigo nuevo ya lo usa otro', async () => {
      const uno = await crearTipo();
      const otro = await crearTipo();

      await api()
        .patch(`/api/tipos-mantenimiento/${otro.id}`)
        .set('Cookie', esc.admin.cookie)
        .send({ codigo: uno.codigo })
        .expect(422);
    });

    it('403 si lo intenta un tecnico', async () => {
      const tipo = await crearTipo();

      await api()
        .patch(`/api/tipos-mantenimiento/${tipo.id}`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ nombre: 'Del tecnico' })
        .expect(403);
    });

    it('404 si no existe', async () => {
      await api()
        .patch('/api/tipos-mantenimiento/cly0000000000000000000000')
        .set('Cookie', esc.admin.cookie)
        .send({ nombre: 'Da igual' })
        .expect(404);
    });
  });

  // -------------------------------------------------------------------------
  // Borrado
  // -------------------------------------------------------------------------

  describe('DELETE /api/tipos-mantenimiento/:id', () => {
    it('el admin borra un tipo que nadie uso', async () => {
      const tipo = await crearTipo();

      await api()
        .delete(`/api/tipos-mantenimiento/${tipo.id}`)
        .set('Cookie', esc.admin.cookie)
        .expect(204);

      expect(
        await prisma.tipoMantenimiento.count({ where: { id: tipo.id } }),
      ).toBe(0);
    });

    it('422 si alguna orden lo usa: forma parte de su historial', async () => {
      const tipo = await crearTipo();
      creados.push(tipo.id);

      const orden = await api()
        .post('/api/ordenes')
        .set('Cookie', esc.admin.cookie)
        .send({
          titulo: 'Orden que fija el tipo',
          descripcionProblema: 'Ruido anormal en el motor principal.',
          clienteId: esc.clienteId,
          tipoMantenimientoId: tipo.id,
        })
        .expect(201);
      esc.registrarOrden(cuerpo<{ id: string }>(orden).id);

      const respuesta = await api()
        .delete(`/api/tipos-mantenimiento/${tipo.id}`)
        .set('Cookie', esc.admin.cookie)
        .expect(422);

      expect(cuerpo<ErrorHttp>(respuesta).message).toContain('Desactivelo');
      expect(
        await prisma.tipoMantenimiento.count({ where: { id: tipo.id } }),
      ).toBe(1);
    });

    it('403 si lo intenta un tecnico', async () => {
      const tipo = await crearTipo();

      await api()
        .delete(`/api/tipos-mantenimiento/${tipo.id}`)
        .set('Cookie', esc.tecnico.cookie)
        .expect(403);
    });

    it('404 al borrar dos veces', async () => {
      const tipo = await crearTipo();

      await api()
        .delete(`/api/tipos-mantenimiento/${tipo.id}`)
        .set('Cookie', esc.admin.cookie)
        .expect(204);
      await api()
        .delete(`/api/tipos-mantenimiento/${tipo.id}`)
        .set('Cookie', esc.admin.cookie)
        .expect(404);
    });
  });
});

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { crearAppE2E } from './utils/app-e2e';
import { Escenario, sembrarEscenario } from './utils/escenario';
import { OrdenDetalle, cuerpo } from './utils/tipos';

/**
 * Modulo 9 — reportes e historial (TCI-57, TCI-58, TCI-59, TCI-60).
 *
 * Los e2e corren contra la misma base que el desarrollo, asi que los totales
 * globales del tablero no se pueden afirmar: hay ordenes de otras suites y del
 * seed. Lo que si se puede es acotar el periodo o el cliente al escenario y
 * afirmar sobre eso, que es lo que hacen estos casos.
 */

interface Historial {
  equipo: { id: string; codigo: string; nombre: string };
  resumen: {
    total: number;
    porEstado: Record<string, number>;
    horasTotales: string | null;
    primeraIntervencion: string | null;
    ultimaIntervencion: string | null;
    diasPromedioResolucion: number | null;
  };
  ordenes: { id: string; numero: string; tecnico: { id: string } | null }[];
  truncado: boolean;
}

interface Resumen {
  periodo: { desde: string | null; hasta: string | null };
  total: number;
  abiertas: number;
  porEstado: Record<string, number>;
  porPrioridad: Record<string, number>;
  porTipo: { id: string; nombre: string; ordenes: number }[];
  horasTotales: string | null;
  costos: { manoObra: string; repuestos: string; total: string };
  diasPromedioResolucion: number | null;
}

interface PorTecnico {
  tecnicos: {
    id: string;
    nombre: string;
    total: number;
    completadas: number;
    abiertas: number;
    canceladas: number;
    horas: string;
    costoTotal: string;
    diasPromedioResolucion: number | null;
  }[];
}

describe('Reportes e historial (e2e)', () => {
  let app: INestApplication<App>;
  let esc: Escenario;

  const api = () => request(app.getHttpServer());

  const crearOrden = async (extra: Record<string, unknown> = {}) => {
    const respuesta = await api()
      .post('/api/ordenes')
      .set('Cookie', esc.admin.cookie)
      .send({
        titulo: 'Orden para reportes',
        descripcionProblema: 'Descripcion suficientemente larga.',
        clienteId: esc.clienteId,
        sedeId: esc.sedeId,
        equipoId: esc.equipoId,
        tipoMantenimientoId: esc.tipoConEquipoId,
        ...extra,
      })
      .expect(201);

    const orden = cuerpo<OrdenDetalle>(respuesta);
    esc.registrarOrden(orden.id);
    return orden;
  };

  const asignar = (ordenId: string, tecnicoId: string) =>
    api()
      .post(`/api/ordenes/${ordenId}/asignar`)
      .set('Cookie', esc.admin.cookie)
      .send({ tecnicoId })
      .expect(201);

  beforeAll(async () => {
    app = await crearAppE2E();
    esc = await sembrarEscenario(app);
  });

  afterAll(async () => {
    await esc?.limpiar();
    await app?.close();
  });

  // -------------------------------------------------------------------------
  // TCI-57 — historial por equipo
  // -------------------------------------------------------------------------

  describe('GET /api/equipos/:id/historial', () => {
    it('un tecnico ve TAMBIEN las ordenes de otros sobre el equipo', async () => {
      const suya = await crearOrden();
      await asignar(suya.id, esc.tecnico.id);

      const ajena = await crearOrden();
      await asignar(ajena.id, esc.otroTecnico.id);

      const respuesta = await api()
        .get(`/api/equipos/${esc.equipoId}/historial`)
        .set('Cookie', esc.tecnico.cookie)
        .expect(200);

      const ids = cuerpo<Historial>(respuesta).ordenes.map((o) => o.id);
      expect(ids).toContain(suya.id);
      // Esta es la excepcion deliberada de TCI-57: sin ella el tecnico
      // diagnosticaria con medio historial.
      expect(ids).toContain(ajena.id);
    });

    it('el listado general sigue aislando por tecnico', async () => {
      const ajena = await crearOrden();
      await asignar(ajena.id, esc.otroTecnico.id);

      const respuesta = await api()
        .get('/api/ordenes')
        .query({ equipoId: esc.equipoId })
        .set('Cookie', esc.tecnico.cookie)
        .expect(200);

      const ids = cuerpo<{ data: { id: string }[] }>(respuesta).data.map(
        (o) => o.id,
      );
      expect(ids).not.toContain(ajena.id);
    });

    it('no expone costos en el historial del equipo', async () => {
      const respuesta = await api()
        .get(`/api/equipos/${esc.equipoId}/historial`)
        .set('Cookie', esc.tecnico.cookie)
        .expect(200);

      const [orden] = cuerpo<Historial>(respuesta).ordenes;
      expect(orden).not.toHaveProperty('costoTotal');
      expect(orden).not.toHaveProperty('costoManoObra');
    });

    it('resume el equipo: total, reparto por estado y fechas extremas', async () => {
      await crearOrden();

      const respuesta = await api()
        .get(`/api/equipos/${esc.equipoId}/historial`)
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      const { resumen, equipo } = cuerpo<Historial>(respuesta);
      expect(equipo.id).toBe(esc.equipoId);
      expect(resumen.total).toBeGreaterThan(0);
      expect(resumen.porEstado.PENDIENTE).toBeGreaterThan(0);
      expect(resumen.primeraIntervencion).not.toBeNull();
      expect(resumen.ultimaIntervencion).not.toBeNull();
    });

    it('404 si el equipo no existe', async () => {
      await api()
        .get('/api/equipos/no-existe/historial')
        .set('Cookie', esc.admin.cookie)
        .expect(404);
    });
  });

  // -------------------------------------------------------------------------
  // TCI-60 — tablero
  // -------------------------------------------------------------------------

  describe('GET /api/reportes/resumen', () => {
    it('un tecnico no accede: el tablero es de la gerencia', async () => {
      await api()
        .get('/api/reportes/resumen')
        .set('Cookie', esc.tecnico.cookie)
        .expect(403);
    });

    it('acotado al cliente del escenario, los totales cuadran con su desglose', async () => {
      await crearOrden();
      await crearOrden({ prioridad: 'ALTA' });

      const respuesta = await api()
        .get('/api/reportes/resumen')
        .query({ clienteId: esc.clienteId })
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      const r = cuerpo<Resumen>(respuesta);
      const sumaEstados = Object.values(r.porEstado).reduce((a, b) => a + b, 0);
      const sumaPrioridades = Object.values(r.porPrioridad).reduce(
        (a, b) => a + b,
        0,
      );
      const sumaTipos = r.porTipo.reduce((a, t) => a + t.ordenes, 0);

      expect(sumaEstados).toBe(r.total);
      expect(sumaPrioridades).toBe(r.total);
      expect(sumaTipos).toBe(r.total);
      expect(r.abiertas).toBeLessThanOrEqual(r.total);
    });

    it('un periodo sin ordenes devuelve el tablero en cero, no un error', async () => {
      const respuesta = await api()
        .get('/api/reportes/resumen')
        .query({ desde: '1990-01-01', hasta: '1990-01-31' })
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      const r = cuerpo<Resumen>(respuesta);
      expect(r.total).toBe(0);
      expect(r.abiertas).toBe(0);
      expect(r.porTipo).toEqual([]);
      expect(r.diasPromedioResolucion).toBeNull();
    });

    it('`hasta` incluye el dia completo', async () => {
      const orden = await crearOrden();
      const hoy = new Date().toISOString().slice(0, 10);

      const respuesta = await api()
        .get('/api/reportes/resumen')
        .query({ clienteId: esc.clienteId, desde: hoy, hasta: hoy })
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      // Sin el ajuste a las 23:59 la orden recien creada quedaria fuera de su
      // propio dia.
      expect(cuerpo<Resumen>(respuesta).total).toBeGreaterThan(0);
      expect(orden.id).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // TCI-58 — por tecnico
  // -------------------------------------------------------------------------

  describe('GET /api/reportes/tecnicos', () => {
    it('incluye a los tecnicos sin ordenes, en cero', async () => {
      const respuesta = await api()
        .get('/api/reportes/tecnicos')
        .query({ desde: '1990-01-01', hasta: '1990-01-31' })
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      const fila = cuerpo<PorTecnico>(respuesta).tecnicos.find(
        (t) => t.id === esc.tecnico.id,
      );
      expect(fila).toBeDefined();
      expect(fila!.total).toBe(0);
      expect(fila!.diasPromedioResolucion).toBeNull();
    });

    it('cuenta las ordenes asignadas y separa abiertas de cerradas', async () => {
      const orden = await crearOrden();
      await asignar(orden.id, esc.tecnico.id);

      const respuesta = await api()
        .get('/api/reportes/tecnicos')
        .query({ clienteId: esc.clienteId })
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      const fila = cuerpo<PorTecnico>(respuesta).tecnicos.find(
        (t) => t.id === esc.tecnico.id,
      );
      expect(fila!.total).toBeGreaterThan(0);
      expect(fila!.abiertas).toBeGreaterThan(0);
      expect(fila!.total).toBe(
        fila!.abiertas + fila!.completadas + fila!.canceladas,
      );
    });

    it('un tecnico no puede consultar el desempeno del equipo', async () => {
      await api()
        .get('/api/reportes/tecnicos')
        .set('Cookie', esc.tecnico.cookie)
        .expect(403);
    });
  });

  // -------------------------------------------------------------------------
  // TCI-59 — exportacion
  // -------------------------------------------------------------------------

  describe('GET /api/reportes/ordenes', () => {
    it('devuelve un CSV con BOM y separador de punto y coma', async () => {
      await crearOrden();

      const respuesta = await api()
        .get('/api/reportes/ordenes')
        .query({ clienteId: esc.clienteId, formato: 'csv' })
        .set('Cookie', esc.admin.cookie)
        .expect(200)
        .expect('Content-Type', /text\/csv/);

      const texto =
        respuesta.text || (respuesta.body as Buffer).toString('utf8');
      // El BOM es lo que hace que Excel lea las tildes.
      expect(texto.charCodeAt(0)).toBe(0xfeff);
      expect(texto.split('\r\n')[0]).toContain('Numero;Titulo;Estado');
      expect(respuesta.headers['content-disposition']).toContain('.csv');
    });

    it('devuelve un PDF con su cabecera de descarga', async () => {
      await crearOrden();

      const respuesta = await api()
        .get('/api/reportes/ordenes')
        .query({ clienteId: esc.clienteId, formato: 'pdf' })
        .set('Cookie', esc.admin.cookie)
        .buffer()
        .expect(200)
        .expect('Content-Type', /application\/pdf/);

      const buffer = respuesta.body as Buffer;
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
      expect(respuesta.headers['content-disposition']).toContain('.pdf');
    });

    it('respeta el limite de filas', async () => {
      await crearOrden();
      await crearOrden();

      const respuesta = await api()
        .get('/api/reportes/ordenes')
        .query({ clienteId: esc.clienteId, formato: 'csv', limite: 1 })
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      const texto =
        respuesta.text || (respuesta.body as Buffer).toString('utf8');
      // Cabecera + una fila.
      expect(texto.trim().split('\r\n')).toHaveLength(2);
    });

    it('rechaza un formato que no existe', async () => {
      await api()
        .get('/api/reportes/ordenes')
        .query({ formato: 'docx' })
        .set('Cookie', esc.admin.cookie)
        .expect(400);
    });

    it('un tecnico no exporta el trabajo del equipo', async () => {
      await api()
        .get('/api/reportes/ordenes')
        .set('Cookie', esc.tecnico.cookie)
        .expect(403);
    });
  });
});

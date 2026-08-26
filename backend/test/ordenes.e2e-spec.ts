import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { OrdenEstado, TipoHistorial } from '../src/generated/prisma/enums';
import { crearAppE2E } from './utils/app-e2e';
import { Escenario, sembrarEscenario } from './utils/escenario';
import {
  AsientoHistorial,
  ErrorHttp,
  ListadoOrdenes,
  OrdenDetalle,
  cuerpo,
} from './utils/tipos';

/**
 * TCI-23 — e2e del CRUD de ordenes de trabajo.
 *
 * Cubre OrdenesController de punta a punta contra Postgres: alta (TCI-24),
 * listado y filtros (TCI-25), edicion (TCI-26), cierre y cancelacion (TCI-27),
 * asignacion (TCI-28), historial (TCI-29), comentarios (TCI-42) y la maquina de
 * estados (TCI-78) montada sobre HTTP.
 *
 * La maquina de estados ya tiene tests unitarios en
 * src/ordenes/orden-estado.service.spec.ts; aqui no se reproduce su tabla de
 * transiciones, solo se comprueba que el controller la aplica de verdad y que
 * la escritura resultante (estado, fechas, historial) queda en la base.
 *
 * Necesita Postgres arriba: `docker compose up -d postgres` desde la raiz.
 */
describe('Ordenes de trabajo (e2e)', () => {
  let app: INestApplication<App>;
  let esc: Escenario;

  const api = () => request(app.getHttpServer());

  /** Ultimo asiento del historial, que es el que escribio la accion en curso. */
  const ultimoAsiento = (orden: OrdenDetalle): AsientoHistorial => {
    const asiento = orden.historial.at(-1);
    if (!asiento) throw new Error('La orden no tiene historial.');
    return asiento;
  };

  const ids = (lista: ListadoOrdenes) => lista.data.map((o) => o.id);

  /** Cuerpo valido minimo, con el tipo que exige equipo. */
  const cuerpoValido = (extra: Record<string, unknown> = {}) => ({
    titulo: 'Compresor sin presion',
    descripcionProblema: 'El compresor arranca pero no levanta presion.',
    clienteId: esc.clienteId,
    sedeId: esc.sedeId,
    equipoId: esc.equipoId,
    tipoMantenimientoId: esc.tipoConEquipoId,
    ...extra,
  });

  /** Crea una orden como admin y la deja registrada para la limpieza. */
  const crearOrden = async (
    extra: Record<string, unknown> = {},
  ): Promise<OrdenDetalle> => {
    const respuesta = await api()
      .post('/api/ordenes')
      .set('Cookie', esc.admin.cookie)
      .send(cuerpoValido(extra))
      .expect(201);

    const orden = cuerpo<OrdenDetalle>(respuesta);
    esc.registrarOrden(orden.id);
    return orden;
  };

  /** Deja una orden EN_PROCESO con `tecnico` asignado. */
  const ordenEnProceso = async (): Promise<OrdenDetalle> => {
    const orden = await crearOrden();
    await api()
      .post(`/api/ordenes/${orden.id}/asignar`)
      .set('Cookie', esc.admin.cookie)
      .send({ tecnicoId: esc.tecnico.id })
      .expect(201);
    await api()
      .post(`/api/ordenes/${orden.id}/iniciar`)
      .set('Cookie', esc.tecnico.cookie)
      .send({})
      .expect(201);
    return orden;
  };

  beforeAll(async () => {
    app = await crearAppE2E();
    esc = await sembrarEscenario(app);
  });

  afterAll(async () => {
    await esc?.limpiar();
    await app?.close();
  });

  // -------------------------------------------------------------------------
  // TCI-33 — sin sesion no se entra
  // -------------------------------------------------------------------------

  describe('autenticacion (TCI-33)', () => {
    it('rechaza el listado sin sesion', async () => {
      await api().get('/api/ordenes').expect(401);
    });

    it('rechaza el alta sin sesion', async () => {
      await api().post('/api/ordenes').send(cuerpoValido()).expect(401);
    });
  });

  // -------------------------------------------------------------------------
  // TCI-24 — crear
  // -------------------------------------------------------------------------

  describe('POST /api/ordenes (TCI-24)', () => {
    it('crea la orden en PENDIENTE, con correlativo y primer asiento de historial', async () => {
      const orden = await crearOrden();

      expect(orden.estado).toBe(OrdenEstado.PENDIENTE);
      expect(orden.numero).toMatch(/^OT-\d{4}-\d{4}$/);
      expect(orden.numero.startsWith(`OT-${new Date().getFullYear()}-`)).toBe(
        true,
      );
      expect(orden.origen).toBe('MANUAL');
      expect(orden.prioridad).toBe('MEDIA');
      expect(orden.tecnicoId).toBeNull();
      expect(orden.creadoPorId).toBe(esc.admin.id);
      expect(orden.fechaInicio).toBeNull();
      expect(orden.fechaFin).toBeNull();

      // Regla 6 del modelo de datos: el historial arranca con el alta.
      expect(orden.historial).toHaveLength(1);
      expect(orden.historial[0]).toMatchObject({
        tipo: TipoHistorial.CAMBIO_ESTADO,
        estadoAnterior: null,
        estadoNuevo: OrdenEstado.PENDIENTE,
        comentario: 'Orden creada',
        usuarioId: esc.admin.id,
      });
    });

    it('un tecnico tambien puede levantar una orden', async () => {
      const respuesta = await api()
        .post('/api/ordenes')
        .set('Cookie', esc.tecnico.cookie)
        .send(cuerpoValido({ titulo: 'Fuga en la linea de aire' }))
        .expect(201);

      const orden = cuerpo<OrdenDetalle>(respuesta);
      esc.registrarOrden(orden.id);

      expect(orden.creadoPorId).toBe(esc.tecnico.id);
      // Nace sin asignar aunque la levante el tecnico: asignar es de admin.
      expect(orden.tecnicoId).toBeNull();
    });

    it('avanza el correlativo entre altas consecutivas', async () => {
      const primera = await crearOrden();
      const segunda = await crearOrden();

      const numero = (n: string) => Number.parseInt(n.slice(-4), 10);
      expect(numero(segunda.numero)).toBe(numero(primera.numero) + 1);
    });

    it('acepta prioridad y fechas de planificacion', async () => {
      const orden = await crearOrden({
        prioridad: 'URGENTE',
        fechaProgramada: '2026-09-10T14:00:00.000Z',
        fechaLimite: '2026-09-12T23:00:00.000Z',
      });

      expect(orden.prioridad).toBe('URGENTE');
      expect(orden.fechaProgramada).toBe('2026-09-10T14:00:00.000Z');
      expect(orden.fechaLimite).toBe('2026-09-12T23:00:00.000Z');
    });

    it('422 si el tipo de mantenimiento exige equipo y no se manda', async () => {
      const respuesta = await api()
        .post('/api/ordenes')
        .set('Cookie', esc.admin.cookie)
        .send(cuerpoValido({ equipoId: undefined }))
        .expect(422);

      expect(cuerpo<ErrorHttp>(respuesta).message).toContain(
        'exige indicar un equipo',
      );
    });

    it('422 si el tipo de mantenimiento esta inactivo', async () => {
      await api()
        .post('/api/ordenes')
        .set('Cookie', esc.admin.cookie)
        .send(
          cuerpoValido({
            tipoMantenimientoId: esc.tipoInactivoId,
            equipoId: undefined,
          }),
        )
        .expect(422);
    });

    it('422 si el equipo es de otro cliente', async () => {
      const respuesta = await api()
        .post('/api/ordenes')
        .set('Cookie', esc.admin.cookie)
        .send(cuerpoValido({ equipoId: esc.otroEquipoId }))
        .expect(422);

      expect(cuerpo<ErrorHttp>(respuesta).message).toContain(
        'no pertenece al cliente',
      );
    });

    it('422 si la sede es de otro cliente', async () => {
      await api()
        .post('/api/ordenes')
        .set('Cookie', esc.admin.cookie)
        .send(
          cuerpoValido({
            clienteId: esc.otroClienteId,
            equipoId: undefined,
            tipoMantenimientoId: esc.tipoSinEquipoId,
          }),
        )
        .expect(422);
    });

    it('400 si el titulo no cumple la longitud minima', async () => {
      await api()
        .post('/api/ordenes')
        .set('Cookie', esc.admin.cookie)
        .send(cuerpoValido({ titulo: 'ab' }))
        .expect(400);
    });

    it('400 si se intenta fijar el estado en el alta (TCI-78 regla 1)', async () => {
      await api()
        .post('/api/ordenes')
        .set('Cookie', esc.admin.cookie)
        .send(cuerpoValido({ estado: OrdenEstado.COMPLETADA }))
        .expect(400);
    });

    it('400 si se intenta asignar tecnico en el alta (TCI-28)', async () => {
      await api()
        .post('/api/ordenes')
        .set('Cookie', esc.admin.cookie)
        .send(cuerpoValido({ tecnicoId: esc.tecnico.id }))
        .expect(400);
    });
  });

  // -------------------------------------------------------------------------
  // TCI-25 — listar y filtrar
  // -------------------------------------------------------------------------

  describe('GET /api/ordenes (TCI-25)', () => {
    it('devuelve data y meta de paginacion', async () => {
      await crearOrden();

      const respuesta = await api()
        .get('/api/ordenes')
        .query({ clienteId: esc.clienteId, perPage: 5 })
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      const lista = cuerpo<ListadoOrdenes>(respuesta);
      expect(Array.isArray(lista.data)).toBe(true);
      expect(lista.data.length).toBeLessThanOrEqual(5);
      expect(lista.meta).toMatchObject({ page: 1, perPage: 5 });
      expect(lista.meta.total).toBeGreaterThan(0);
      expect(lista.meta.totalPages).toBe(Math.ceil(lista.meta.total / 5));
      // El listado trae las relaciones que pinta la tabla, no el detalle.
      expect(lista.data[0].cliente).toHaveProperty('nombre');
      expect(lista.data[0]).not.toHaveProperty('historial');
    });

    it('filtra por estado', async () => {
      const orden = await ordenEnProceso();

      const respuesta = await api()
        .get('/api/ordenes')
        .query({ clienteId: esc.clienteId, estado: OrdenEstado.EN_PROCESO })
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      const lista = cuerpo<ListadoOrdenes>(respuesta);
      expect(ids(lista)).toContain(orden.id);
      expect(lista.data.every((o) => o.estado === OrdenEstado.EN_PROCESO)).toBe(
        true,
      );
    });

    it('acepta varios estados separados por coma', async () => {
      const respuesta = await api()
        .get('/api/ordenes')
        .query({
          clienteId: esc.clienteId,
          estado: `${OrdenEstado.PENDIENTE},${OrdenEstado.EN_PROCESO}`,
        })
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      const permitidos: OrdenEstado[] = [
        OrdenEstado.PENDIENTE,
        OrdenEstado.EN_PROCESO,
      ];
      expect(
        cuerpo<ListadoOrdenes>(respuesta).data.every((o) =>
          permitidos.includes(o.estado),
        ),
      ).toBe(true);
    });

    it('busca por numero y por titulo con `q`', async () => {
      const orden = await crearOrden({ titulo: 'Termografia de tablero' });

      const porNumero = await api()
        .get('/api/ordenes')
        .query({ q: orden.numero })
        .set('Cookie', esc.admin.cookie)
        .expect(200);
      expect(ids(cuerpo<ListadoOrdenes>(porNumero))).toContain(orden.id);

      // `contains` con mode insensitive: la busqueda ignora mayusculas.
      const porTitulo = await api()
        .get('/api/ordenes')
        .query({ q: 'termografia de tablero' })
        .set('Cookie', esc.admin.cookie)
        .expect(200);
      expect(ids(cuerpo<ListadoOrdenes>(porTitulo))).toContain(orden.id);
    });

    it('un tecnico solo ve sus ordenes, aunque filtre por otro tecnico', async () => {
      const suya = await crearOrden();
      const ajena = await crearOrden();

      await api()
        .post(`/api/ordenes/${suya.id}/asignar`)
        .set('Cookie', esc.admin.cookie)
        .send({ tecnicoId: esc.tecnico.id })
        .expect(201);
      await api()
        .post(`/api/ordenes/${ajena.id}/asignar`)
        .set('Cookie', esc.admin.cookie)
        .send({ tecnicoId: esc.otroTecnico.id })
        .expect(201);

      const respuesta = await api()
        .get('/api/ordenes')
        // El filtro pide explicitamente las del otro tecnico: debe ignorarse.
        .query({ clienteId: esc.clienteId, tecnicoId: esc.otroTecnico.id })
        .set('Cookie', esc.tecnico.cookie)
        .expect(200);

      const lista = cuerpo<ListadoOrdenes>(respuesta);
      expect(ids(lista)).toContain(suya.id);
      expect(ids(lista)).not.toContain(ajena.id);
      expect(lista.data.every((o) => o.tecnicoId === esc.tecnico.id)).toBe(
        true,
      );
    });

    it('un admin si puede filtrar por tecnico', async () => {
      const respuesta = await api()
        .get('/api/ordenes')
        .query({ clienteId: esc.clienteId, tecnicoId: esc.otroTecnico.id })
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      const lista = cuerpo<ListadoOrdenes>(respuesta);
      expect(lista.meta.total).toBeGreaterThan(0);
      expect(lista.data.every((o) => o.tecnicoId === esc.otroTecnico.id)).toBe(
        true,
      );
    });

    it('400 si el filtro trae un estado inexistente', async () => {
      await api()
        .get('/api/ordenes')
        .query({ estado: 'ARCHIVADA' })
        .set('Cookie', esc.admin.cookie)
        .expect(400);
    });

    it('400 si perPage se sale del maximo', async () => {
      await api()
        .get('/api/ordenes')
        .query({ perPage: 500 })
        .set('Cookie', esc.admin.cookie)
        .expect(400);
    });

    it('400 si orderBy no es un campo ordenable', async () => {
      await api()
        .get('/api/ordenes')
        .query({ orderBy: 'costoTotal' })
        .set('Cookie', esc.admin.cookie)
        .expect(400);
    });
  });

  // -------------------------------------------------------------------------
  // Detalle
  // -------------------------------------------------------------------------

  describe('GET /api/ordenes/:id', () => {
    it('el admin ve el detalle con las acciones disponibles', async () => {
      const creada = await crearOrden();

      const respuesta = await api()
        .get(`/api/ordenes/${creada.id}`)
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      const orden = cuerpo<OrdenDetalle>(respuesta);
      expect(orden.id).toBe(creada.id);
      expect(orden.cliente).toHaveProperty('nombre');
      expect(orden.tipoMantenimiento).toHaveProperty('codigo');
      expect(Array.isArray(orden.historial)).toBe(true);
      expect(Array.isArray(orden.adjuntos)).toBe(true);
      // Sobre una orden PENDIENTE, un admin solo puede asignar o cancelar.
      expect(orden.accionesDisponibles?.slice().sort()).toEqual([
        'asignar',
        'cancelar',
      ]);
    });

    it('un tecnico no asignado recibe 403', async () => {
      const orden = await crearOrden();

      await api()
        .get(`/api/ordenes/${orden.id}`)
        .set('Cookie', esc.tecnico.cookie)
        .expect(403);
    });

    it('el tecnico asignado ve el detalle y sus acciones', async () => {
      const creada = await crearOrden();
      await api()
        .post(`/api/ordenes/${creada.id}/asignar`)
        .set('Cookie', esc.admin.cookie)
        .send({ tecnicoId: esc.tecnico.id })
        .expect(201);

      const respuesta = await api()
        .get(`/api/ordenes/${creada.id}`)
        .set('Cookie', esc.tecnico.cookie)
        .expect(200);

      // Sobre una ASIGNADA suya, el tecnico solo puede arrancarla.
      expect(cuerpo<OrdenDetalle>(respuesta).accionesDisponibles).toEqual([
        'iniciar',
      ]);
    });

    it('404 si la orden no existe', async () => {
      await api()
        .get('/api/ordenes/cly0000000000000000000000')
        .set('Cookie', esc.admin.cookie)
        .expect(404);
    });
  });

  // -------------------------------------------------------------------------
  // TCI-26 — actualizar
  // -------------------------------------------------------------------------

  describe('PATCH /api/ordenes/:id (TCI-26)', () => {
    it('el admin edita y deja un asiento de historial por campo (TCI-29)', async () => {
      const creada = await crearOrden({ titulo: 'Titulo original' });

      const respuesta = await api()
        .patch(`/api/ordenes/${creada.id}`)
        .set('Cookie', esc.admin.cookie)
        .send({ titulo: 'Titulo corregido', prioridad: 'ALTA' })
        .expect(200);

      const orden = cuerpo<OrdenDetalle>(respuesta);
      expect(orden.titulo).toBe('Titulo corregido');
      expect(orden.prioridad).toBe('ALTA');

      const ediciones = orden.historial.filter(
        (h) => h.tipo === TipoHistorial.EDICION,
      );
      expect(ediciones).toHaveLength(2);
      expect(ediciones).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            campo: 'titulo',
            valorAnterior: 'Titulo original',
            valorNuevo: 'Titulo corregido',
          }),
          expect.objectContaining({
            campo: 'prioridad',
            valorAnterior: 'MEDIA',
            valorNuevo: 'ALTA',
          }),
        ]),
      );
    });

    it('no escribe historial si el valor enviado es el que ya tenia', async () => {
      const creada = await crearOrden({ titulo: 'Sin cambios' });

      const respuesta = await api()
        .patch(`/api/ordenes/${creada.id}`)
        .set('Cookie', esc.admin.cookie)
        .send({ titulo: 'Sin cambios' })
        .expect(200);

      expect(
        cuerpo<OrdenDetalle>(respuesta).historial.filter(
          (h) => h.tipo === TipoHistorial.EDICION,
        ),
      ).toHaveLength(0);
    });

    it('403 si edita un tecnico, aunque sea el asignado', async () => {
      const orden = await crearOrden();
      await api()
        .post(`/api/ordenes/${orden.id}/asignar`)
        .set('Cookie', esc.admin.cookie)
        .send({ tecnicoId: esc.tecnico.id })
        .expect(201);

      await api()
        .patch(`/api/ordenes/${orden.id}`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ titulo: 'Intento del tecnico' })
        .expect(403);
    });

    it('400 si se intenta cambiar el estado por PATCH (TCI-78 regla 1)', async () => {
      const orden = await crearOrden();

      await api()
        .patch(`/api/ordenes/${orden.id}`)
        .set('Cookie', esc.admin.cookie)
        .send({ estado: OrdenEstado.COMPLETADA })
        .expect(400);
    });

    it('400 si se intenta reasignar el tecnico por PATCH (TCI-28)', async () => {
      const orden = await crearOrden();

      await api()
        .patch(`/api/ordenes/${orden.id}`)
        .set('Cookie', esc.admin.cookie)
        .send({ tecnicoId: esc.tecnico.id })
        .expect(400);
    });

    it('400 si se intenta mover la orden de cliente', async () => {
      const orden = await crearOrden();

      await api()
        .patch(`/api/ordenes/${orden.id}`)
        .set('Cookie', esc.admin.cookie)
        .send({ clienteId: esc.otroClienteId })
        .expect(400);
    });

    it('422 si el equipo nuevo no es del cliente de la orden', async () => {
      const orden = await crearOrden();

      await api()
        .patch(`/api/ordenes/${orden.id}`)
        .set('Cookie', esc.admin.cookie)
        .send({ equipoId: esc.otroEquipoId })
        .expect(422);
    });

    it('422 al editar una orden ya completada', async () => {
      const orden = await ordenEnProceso();
      await api()
        .post(`/api/ordenes/${orden.id}/completar`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ trabajoRealizado: 'Se cambio el empaque del cabezal.' })
        .expect(201);

      const respuesta = await api()
        .patch(`/api/ordenes/${orden.id}`)
        .set('Cookie', esc.admin.cookie)
        .send({ titulo: 'Editar despues de cerrar' })
        .expect(422);

      expect(cuerpo<ErrorHttp>(respuesta).message).toContain(
        'Reabrala primero',
      );
    });

    it('404 si la orden no existe', async () => {
      await api()
        .patch('/api/ordenes/cly0000000000000000000000')
        .set('Cookie', esc.admin.cookie)
        .send({ titulo: 'Da igual' })
        .expect(404);
    });
  });

  // -------------------------------------------------------------------------
  // TCI-28 — asignacion
  // -------------------------------------------------------------------------

  describe('asignacion (TCI-28)', () => {
    it('asignar pasa a ASIGNADA, fija fechaAsignacion y escribe historial', async () => {
      const creada = await crearOrden();

      const respuesta = await api()
        .post(`/api/ordenes/${creada.id}/asignar`)
        .set('Cookie', esc.admin.cookie)
        .send({ tecnicoId: esc.tecnico.id })
        .expect(201);

      const orden = cuerpo<OrdenDetalle>(respuesta);
      expect(orden.estado).toBe(OrdenEstado.ASIGNADA);
      expect(orden.tecnicoId).toBe(esc.tecnico.id);
      expect(orden.fechaAsignacion).not.toBeNull();
      expect(orden.tecnico?.id).toBe(esc.tecnico.id);

      expect(ultimoAsiento(orden)).toMatchObject({
        tipo: TipoHistorial.ASIGNACION,
        estadoAnterior: OrdenEstado.PENDIENTE,
        estadoNuevo: OrdenEstado.ASIGNADA,
        campo: 'tecnicoId',
        valorAnterior: null,
        valorNuevo: esc.tecnico.id,
      });
    });

    it('reasignar cambia de tecnico y guarda el anterior en el historial', async () => {
      const creada = await crearOrden();
      await api()
        .post(`/api/ordenes/${creada.id}/asignar`)
        .set('Cookie', esc.admin.cookie)
        .send({ tecnicoId: esc.tecnico.id })
        .expect(201);

      const respuesta = await api()
        .post(`/api/ordenes/${creada.id}/reasignar`)
        .set('Cookie', esc.admin.cookie)
        .send({ tecnicoId: esc.otroTecnico.id })
        .expect(201);

      const orden = cuerpo<OrdenDetalle>(respuesta);
      expect(orden.estado).toBe(OrdenEstado.ASIGNADA);
      expect(orden.tecnicoId).toBe(esc.otroTecnico.id);
      expect(ultimoAsiento(orden)).toMatchObject({
        campo: 'tecnicoId',
        valorAnterior: esc.tecnico.id,
        valorNuevo: esc.otroTecnico.id,
      });
    });

    it('desasignar devuelve la orden a PENDIENTE y la deja sin tecnico', async () => {
      const creada = await crearOrden();
      await api()
        .post(`/api/ordenes/${creada.id}/asignar`)
        .set('Cookie', esc.admin.cookie)
        .send({ tecnicoId: esc.tecnico.id })
        .expect(201);

      const respuesta = await api()
        .post(`/api/ordenes/${creada.id}/desasignar`)
        .set('Cookie', esc.admin.cookie)
        .send({ comentario: 'El tecnico salio de vacaciones' })
        .expect(201);

      const orden = cuerpo<OrdenDetalle>(respuesta);
      expect(orden.estado).toBe(OrdenEstado.PENDIENTE);
      expect(orden.tecnicoId).toBeNull();
      expect(orden.fechaAsignacion).toBeNull();
      expect(ultimoAsiento(orden).comentario).toBe(
        'El tecnico salio de vacaciones',
      );
    });

    it('403 si asigna un tecnico', async () => {
      const orden = await crearOrden();

      const respuesta = await api()
        .post(`/api/ordenes/${orden.id}/asignar`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ tecnicoId: esc.tecnico.id })
        .expect(403);

      expect(cuerpo<ErrorHttp>(respuesta).message).toContain('administrador');
    });

    it('422 si el tecnico esta desactivado', async () => {
      const orden = await crearOrden();

      const respuesta = await api()
        .post(`/api/ordenes/${orden.id}/asignar`)
        .set('Cookie', esc.admin.cookie)
        .send({ tecnicoId: esc.tecnicoInactivo.id })
        .expect(422);

      expect(cuerpo<ErrorHttp>(respuesta).message).toContain('desactivado');
    });

    it('422 si el tecnico no existe', async () => {
      const orden = await crearOrden();

      await api()
        .post(`/api/ordenes/${orden.id}/asignar`)
        .set('Cookie', esc.admin.cookie)
        .send({ tecnicoId: 'cly0000000000000000000000' })
        .expect(422);
    });

    it('422 al asignar una orden que ya esta asignada', async () => {
      const orden = await crearOrden();
      await api()
        .post(`/api/ordenes/${orden.id}/asignar`)
        .set('Cookie', esc.admin.cookie)
        .send({ tecnicoId: esc.tecnico.id })
        .expect(201);

      const respuesta = await api()
        .post(`/api/ordenes/${orden.id}/asignar`)
        .set('Cookie', esc.admin.cookie)
        .send({ tecnicoId: esc.otroTecnico.id })
        .expect(422);

      expect(cuerpo<ErrorHttp>(respuesta).message).toContain('ASIGNADA');
    });
  });

  // -------------------------------------------------------------------------
  // TCI-78 / TCI-27 — ciclo de vida
  // -------------------------------------------------------------------------

  describe('ciclo de vida de la orden (TCI-78, TCI-27)', () => {
    it('recorre asignar -> iniciar -> pausar -> reanudar -> completar', async () => {
      const creada = await crearOrden({ titulo: 'Orden de ciclo completo' });
      const url = (accion: string) => `/api/ordenes/${creada.id}/${accion}`;

      await api()
        .post(url('asignar'))
        .set('Cookie', esc.admin.cookie)
        .send({ tecnicoId: esc.tecnico.id })
        .expect(201);

      const iniciada = cuerpo<OrdenDetalle>(
        await api()
          .post(url('iniciar'))
          .set('Cookie', esc.tecnico.cookie)
          .send({})
          .expect(201),
      );
      expect(iniciada.estado).toBe(OrdenEstado.EN_PROCESO);
      expect(iniciada.fechaInicio).not.toBeNull();
      const fechaInicio = iniciada.fechaInicio;

      const pausada = cuerpo<OrdenDetalle>(
        await api()
          .post(url('pausar'))
          .set('Cookie', esc.tecnico.cookie)
          .send({ motivo: 'Falta el repuesto del cabezal' })
          .expect(201),
      );
      expect(pausada.estado).toBe(OrdenEstado.EN_ESPERA);
      expect(ultimoAsiento(pausada).comentario).toBe(
        'Falta el repuesto del cabezal',
      );

      const reanudada = cuerpo<OrdenDetalle>(
        await api()
          .post(url('reanudar'))
          .set('Cookie', esc.tecnico.cookie)
          .send({})
          .expect(201),
      );
      expect(reanudada.estado).toBe(OrdenEstado.EN_PROCESO);
      // Reanudar no puede falsear el tiempo de respuesta que mide TCI-60.
      expect(reanudada.fechaInicio).toBe(fechaInicio);

      const completada = cuerpo<OrdenDetalle>(
        await api()
          .post(url('completar'))
          .set('Cookie', esc.tecnico.cookie)
          .send({
            trabajoRealizado: 'Se reemplazo el cabezal y se probo en carga.',
            horasTrabajadas: 3.5,
            costoManoObra: 1500,
          })
          .expect(201),
      );

      expect(completada.estado).toBe(OrdenEstado.COMPLETADA);
      expect(completada.fechaFin).not.toBeNull();
      expect(completada.trabajoRealizado).toBe(
        'Se reemplazo el cabezal y se probo en carga.',
      );
      expect(Number(completada.horasTrabajadas)).toBe(3.5);
      expect(Number(completada.costoManoObra)).toBe(1500);
      // costoTotal = mano de obra + repuestos (todavia 0 hasta TCI-46).
      expect(Number(completada.costoTotal)).toBe(1500);

      // TCI-29: el hilo completo queda en el historial y en orden cronologico.
      expect(completada.historial.map((h) => h.estadoNuevo)).toEqual([
        OrdenEstado.PENDIENTE,
        OrdenEstado.ASIGNADA,
        OrdenEstado.EN_PROCESO,
        OrdenEstado.EN_ESPERA,
        OrdenEstado.EN_PROCESO,
        OrdenEstado.COMPLETADA,
      ]);
      const fechas = completada.historial.map((h) => Date.parse(h.createdAt));
      expect(fechas).toEqual([...fechas].sort((a, b) => a - b));
    });

    it('el admin reabre una orden completada y el tecnico no', async () => {
      const creada = await ordenEnProceso();
      await api()
        .post(`/api/ordenes/${creada.id}/completar`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ trabajoRealizado: 'Se ajusto la valvula de descarga.' })
        .expect(201);

      await api()
        .post(`/api/ordenes/${creada.id}/reabrir`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ motivo: 'Quiero seguir trabajandola' })
        .expect(403);

      const reabierta = cuerpo<OrdenDetalle>(
        await api()
          .post(`/api/ordenes/${creada.id}/reabrir`)
          .set('Cookie', esc.admin.cookie)
          .send({ motivo: 'El cliente reporta la misma falla' })
          .expect(201),
      );

      expect(reabierta.estado).toBe(OrdenEstado.EN_PROCESO);
      // El cierre anterior deja de valer.
      expect(reabierta.fechaFin).toBeNull();
    });

    it('cancelar exige motivo y es de admin', async () => {
      const creada = await crearOrden();

      await api()
        .post(`/api/ordenes/${creada.id}/cancelar`)
        .set('Cookie', esc.admin.cookie)
        .send({ motivo: '' })
        .expect(400);

      await api()
        .post(`/api/ordenes/${creada.id}/cancelar`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ motivo: 'El cliente desistio' })
        .expect(403);

      const cancelada = cuerpo<OrdenDetalle>(
        await api()
          .post(`/api/ordenes/${creada.id}/cancelar`)
          .set('Cookie', esc.admin.cookie)
          .send({ motivo: 'El cliente desistio del servicio' })
          .expect(201),
      );

      expect(cancelada.estado).toBe(OrdenEstado.CANCELADA);
      expect(ultimoAsiento(cancelada).comentario).toBe(
        'El cliente desistio del servicio',
      );
    });

    it('una orden cancelada ya no admite transiciones', async () => {
      const orden = await crearOrden();
      await api()
        .post(`/api/ordenes/${orden.id}/cancelar`)
        .set('Cookie', esc.admin.cookie)
        .send({ motivo: 'Duplicada' })
        .expect(201);

      await api()
        .post(`/api/ordenes/${orden.id}/reabrir`)
        .set('Cookie', esc.admin.cookie)
        .send({ motivo: 'Reintento' })
        .expect(422);

      const respuesta = await api()
        .get(`/api/ordenes/${orden.id}`)
        .set('Cookie', esc.admin.cookie)
        .expect(200);
      expect(cuerpo<OrdenDetalle>(respuesta).accionesDisponibles).toEqual([]);
    });

    it('rechaza pausar sin un motivo real', async () => {
      const orden = await ordenEnProceso();

      // MinLength(3) del DTO corta antes de llegar al servicio: es 400.
      await api()
        .post(`/api/ordenes/${orden.id}/pausar`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ motivo: '  ' })
        .expect(400);

      // Con longitud suficiente pero solo espacios, ya entra la regla del
      // servicio de estados (TCI-78 regla 5).
      await api()
        .post(`/api/ordenes/${orden.id}/pausar`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ motivo: '    ' })
        .expect(422);
    });

    it('422 al iniciar una orden que sigue PENDIENTE', async () => {
      const orden = await crearOrden();

      const respuesta = await api()
        .post(`/api/ordenes/${orden.id}/iniciar`)
        .set('Cookie', esc.admin.cookie)
        .send({})
        .expect(422);

      expect(cuerpo<ErrorHttp>(respuesta).message).toContain('PENDIENTE');
    });

    it('403 si un tecnico opera una orden que no es suya', async () => {
      const orden = await crearOrden();
      await api()
        .post(`/api/ordenes/${orden.id}/asignar`)
        .set('Cookie', esc.admin.cookie)
        .send({ tecnicoId: esc.tecnico.id })
        .expect(201);

      const respuesta = await api()
        .post(`/api/ordenes/${orden.id}/iniciar`)
        .set('Cookie', esc.otroTecnico.cookie)
        .send({})
        .expect(403);

      expect(cuerpo<ErrorHttp>(respuesta).message).toContain(
        'tecnico asignado',
      );
    });

    it('400 al completar sin describir el trabajo realizado', async () => {
      const orden = await ordenEnProceso();

      await api()
        .post(`/api/ordenes/${orden.id}/completar`)
        .set('Cookie', esc.tecnico.cookie)
        .send({})
        .expect(400);

      await api()
        .post(`/api/ordenes/${orden.id}/completar`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ trabajoRealizado: 'listo' })
        .expect(400);
    });

    it('404 al operar una orden inexistente', async () => {
      await api()
        .post('/api/ordenes/cly0000000000000000000000/iniciar')
        .set('Cookie', esc.admin.cookie)
        .send({})
        .expect(404);
    });
  });

  // -------------------------------------------------------------------------
  // TCI-42 — comentarios
  // -------------------------------------------------------------------------

  describe('POST /api/ordenes/:id/comentarios (TCI-42)', () => {
    it('agrega el comentario al historial sin tocar el estado', async () => {
      const creada = await crearOrden();
      await api()
        .post(`/api/ordenes/${creada.id}/asignar`)
        .set('Cookie', esc.admin.cookie)
        .send({ tecnicoId: esc.tecnico.id })
        .expect(201);

      const respuesta = await api()
        .post(`/api/ordenes/${creada.id}/comentarios`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ comentario: '  El cliente pide llegar antes de las 8am.  ' })
        .expect(201);

      const orden = cuerpo<OrdenDetalle>(respuesta);
      expect(orden.estado).toBe(OrdenEstado.ASIGNADA);
      expect(ultimoAsiento(orden)).toMatchObject({
        tipo: TipoHistorial.COMENTARIO,
        usuarioId: esc.tecnico.id,
        comentario: 'El cliente pide llegar antes de las 8am.',
        estadoAnterior: null,
        estadoNuevo: null,
      });
    });

    it('403 si comenta un tecnico que no tiene la orden asignada', async () => {
      const orden = await crearOrden();

      await api()
        .post(`/api/ordenes/${orden.id}/comentarios`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ comentario: 'Comentario de alguien ajeno' })
        .expect(403);
    });

    it('400 si el comentario viene vacio', async () => {
      const orden = await crearOrden();

      await api()
        .post(`/api/ordenes/${orden.id}/comentarios`)
        .set('Cookie', esc.admin.cookie)
        .send({ comentario: '' })
        .expect(400);
    });
  });

  // -------------------------------------------------------------------------
  // Soft delete
  // -------------------------------------------------------------------------

  describe('DELETE /api/ordenes/:id', () => {
    it('el admin la borra logicamente y deja de verse', async () => {
      const orden = await crearOrden({ titulo: 'Orden a descartar' });

      await api()
        .delete(`/api/ordenes/${orden.id}`)
        .set('Cookie', esc.admin.cookie)
        .expect(204);

      await api()
        .get(`/api/ordenes/${orden.id}`)
        .set('Cookie', esc.admin.cookie)
        .expect(404);

      const respuesta = await api()
        .get('/api/ordenes')
        .query({ clienteId: esc.clienteId, q: orden.numero })
        .set('Cookie', esc.admin.cookie)
        .expect(200);
      expect(ids(cuerpo<ListadoOrdenes>(respuesta))).not.toContain(orden.id);
    });

    it('el numero de una orden borrada no se reutiliza', async () => {
      const descartada = await crearOrden();
      await api()
        .delete(`/api/ordenes/${descartada.id}`)
        .set('Cookie', esc.admin.cookie)
        .expect(204);

      const siguiente = await crearOrden();
      expect(siguiente.numero).not.toBe(descartada.numero);
      // Mayor, no exactamente uno mas: los archivos de e2e corren en paralelo
      // contra la misma base, asi que entre estas dos altas puede colarse la
      // orden de otra suite y abrir un hueco. Lo que este caso comprueba es que
      // el numero de la borrada no vuelve a salir, no cuanto avanza el contador.
      const numero = (n: string) => Number.parseInt(n.slice(-4), 10);
      expect(numero(siguiente.numero)).toBeGreaterThan(
        numero(descartada.numero),
      );
    });

    it('403 si la borra un tecnico', async () => {
      const orden = await crearOrden();

      await api()
        .delete(`/api/ordenes/${orden.id}`)
        .set('Cookie', esc.tecnico.cookie)
        .expect(403);
    });

    it('404 al borrar dos veces', async () => {
      const orden = await crearOrden();

      await api()
        .delete(`/api/ordenes/${orden.id}`)
        .set('Cookie', esc.admin.cookie)
        .expect(204);
      await api()
        .delete(`/api/ordenes/${orden.id}`)
        .set('Cookie', esc.admin.cookie)
        .expect(404);
    });
  });
});

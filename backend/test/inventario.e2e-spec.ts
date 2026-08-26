import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { PrismaService } from '../src/prisma/prisma.service';
import { crearAppE2E } from './utils/app-e2e';
import { Escenario, sembrarEscenario } from './utils/escenario';
import { ErrorHttp, OrdenDetalle, cuerpo } from './utils/tipos';

/**
 * Modulo 6 — inventario y repuestos (TCI-45, TCI-46, TCI-47).
 *
 * Los decimales llegan como string por HTTP, igual que los costos de una orden.
 * Se comparan como numero donde importa el valor y como string donde importa la
 * escala, que es lo que ve el frontend.
 */

interface Repuesto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  unidadMedida: string;
  stockActual: string;
  stockMinimo: string;
  costoUnitario: string;
  moneda: string;
  activo: boolean;
  createdAt: string;
}

interface RepuestoAdmin extends Repuesto {
  ordenes: number;
  bajoMinimo: boolean;
}

interface Alerta {
  id: string;
  codigo: string;
  nombre: string;
  stockActual: string;
  stockMinimo: string;
}

interface Movimiento {
  id: string;
  tipo: 'ENTRADA' | 'SALIDA';
  cantidad: string;
  stockResultante: string;
  motivo: string | null;
  createdAt: string;
  usuario: { id: string; name: string };
  orden: { id: string; numero: string } | null;
}

interface LineaConsumo {
  id: string;
  cantidad: string;
  costoUnitario: string;
  createdAt: string;
  repuesto: {
    id: string;
    codigo: string;
    nombre: string;
    unidadMedida: string;
    stockActual: string;
    stockMinimo: string;
    moneda: string;
  };
}

describe('Inventario y repuestos (e2e)', () => {
  let app: INestApplication<App>;
  let esc: Escenario;
  let prisma: PrismaService;

  const api = () => request(app.getHttpServer());
  const repuestosCreados: string[] = [];

  /** Codigo unico por corrida: la tabla se comparte con el seed y con dev. */
  const codigo = (base: string) =>
    `${base}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

  const crearRepuesto = async (extra: Record<string, unknown> = {}) => {
    const respuesta = await api()
      .post('/api/repuestos')
      .set('Cookie', esc.admin.cookie)
      .send({
        codigo: codigo('E2E-RP-'),
        nombre: 'Rodamiento de pruebas',
        unidadMedida: 'unidad',
        stockActual: 100,
        costoUnitario: 250.5,
        ...extra,
      })
      .expect(201);

    const repuesto = cuerpo<Repuesto>(respuesta);
    repuestosCreados.push(repuesto.id);
    return repuesto;
  };

  /**
   * Orden abierta y asignada al tecnico del escenario. El alta no acepta
   * `tecnicoId`: la asignacion es una accion aparte (TCI-28).
   */
  const crearOrden = async (extra: Record<string, unknown> = {}) => {
    const respuesta = await api()
      .post('/api/ordenes')
      .set('Cookie', esc.admin.cookie)
      .send({
        titulo: 'Orden con repuestos',
        descripcionProblema: 'Requiere cambio de rodamiento.',
        clienteId: esc.clienteId,
        tipoMantenimientoId: esc.tipoSinEquipoId,
        ...extra,
      })
      .expect(201);

    const orden = cuerpo<OrdenDetalle>(respuesta);
    esc.registrarOrden(orden.id);

    await api()
      .post(`/api/ordenes/${orden.id}/asignar`)
      .set('Cookie', esc.admin.cookie)
      .send({ tecnicoId: esc.tecnico.id })
      .expect(201);

    return orden;
  };

  const leerRepuesto = async (id: string) => {
    const respuesta = await api()
      .get('/api/repuestos/admin')
      .set('Cookie', esc.admin.cookie)
      .expect(200);
    const encontrado = cuerpo<RepuestoAdmin[]>(respuesta).find(
      (r) => r.id === id,
    );
    if (!encontrado) throw new Error(`No aparece el repuesto ${id}`);
    return encontrado;
  };

  beforeAll(async () => {
    app = await crearAppE2E();
    esc = await sembrarEscenario(app);
    prisma = app.get(PrismaService);
  });

  /**
   * El orden lo imponen las FK, y no es el intuitivo:
   *
   *  1. El libro de movimientos, porque cada asiento apunta al usuario que lo
   *     hizo con `Restrict`. Mientras existan, `limpiar()` no puede borrar los
   *     usuarios del escenario.
   *  2. El escenario, que al borrar las ordenes se lleva por Cascade sus lineas
   *     de consumo.
   *  3. Los repuestos, ya libres: eran esas lineas las que los retenian.
   */
  afterAll(async () => {
    await prisma.movimientoInventario.deleteMany({
      where: { repuestoId: { in: repuestosCreados } },
    });
    await esc?.limpiar();
    await prisma.repuesto.deleteMany({
      where: { id: { in: repuestosCreados } },
    });
    await app?.close();
  });

  // -------------------------------------------------------------------------
  // TCI-45 — catalogo
  // -------------------------------------------------------------------------

  describe('Catalogo de repuestos', () => {
    it('el admin lo crea con su existencia inicial', async () => {
      const repuesto = await crearRepuesto({ stockMinimo: 10 });

      expect(repuesto.nombre).toBe('Rodamiento de pruebas');
      expect(Number(repuesto.stockActual)).toBe(100);
      expect(Number(repuesto.stockMinimo)).toBe(10);
      expect(repuesto.moneda).toBe('HNL');
      expect(repuesto.activo).toBe(true);
    });

    it('normaliza el codigo a mayusculas', async () => {
      const enMinusculas = codigo('e2e-min-').toLowerCase();
      const repuesto = await crearRepuesto({ codigo: enMinusculas });
      expect(repuesto.codigo).toBe(enMinusculas.toUpperCase());
    });

    it('rechaza un codigo repetido con un mensaje que dice quien lo usa', async () => {
      const repuesto = await crearRepuesto();

      const respuesta = await api()
        .post('/api/repuestos')
        .set('Cookie', esc.admin.cookie)
        .send({
          codigo: repuesto.codigo,
          nombre: 'Otro repuesto',
          unidadMedida: 'unidad',
        })
        .expect(422);

      expect(cuerpo<ErrorHttp>(respuesta).message).toContain(
        'Rodamiento de pruebas',
      );
    });

    it('un tecnico ve los disponibles pero no el catalogo de administracion', async () => {
      await crearRepuesto();

      await api()
        .get('/api/repuestos')
        .set('Cookie', esc.tecnico.cookie)
        .expect(200);

      await api()
        .get('/api/repuestos/admin')
        .set('Cookie', esc.tecnico.cookie)
        .expect(403);
    });

    it('los disponibles excluyen los desactivados y los que estan a cero', async () => {
      const sinExistencia = await crearRepuesto({ stockActual: 0 });
      const desactivado = await crearRepuesto();
      await api()
        .patch(`/api/repuestos/${desactivado.id}`)
        .set('Cookie', esc.admin.cookie)
        .send({ activo: false })
        .expect(200);

      const respuesta = await api()
        .get('/api/repuestos')
        .set('Cookie', esc.tecnico.cookie)
        .expect(200);

      const ids = cuerpo<Repuesto[]>(respuesta).map((r) => r.id);
      expect(ids).not.toContain(sinExistencia.id);
      expect(ids).not.toContain(desactivado.id);
    });

    it('no deja editar el stock a mano: solo se mueve con entradas y salidas', async () => {
      const repuesto = await crearRepuesto();

      // `forbidNonWhitelisted` del ValidationPipe rechaza el campo entero.
      await api()
        .patch(`/api/repuestos/${repuesto.id}`)
        .set('Cookie', esc.admin.cookie)
        .send({ stockActual: 9999 })
        .expect(400);

      expect(Number((await leerRepuesto(repuesto.id)).stockActual)).toBe(100);
    });
  });

  // -------------------------------------------------------------------------
  // Movimientos de almacen
  // -------------------------------------------------------------------------

  describe('Entradas y salidas de almacen', () => {
    it('una entrada suma al saldo y deja asiento', async () => {
      const repuesto = await crearRepuesto();

      const respuesta = await api()
        .post(`/api/repuestos/${repuesto.id}/entradas`)
        .set('Cookie', esc.admin.cookie)
        .send({ cantidad: 25, motivo: 'Compra de reposicion' })
        .expect(201);

      expect(Number(cuerpo<Repuesto>(respuesta).stockActual)).toBe(125);

      const libro = await api()
        .get(`/api/repuestos/${repuesto.id}/movimientos`)
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      const [ultimo] = cuerpo<Movimiento[]>(libro);
      expect(ultimo.tipo).toBe('ENTRADA');
      expect(Number(ultimo.cantidad)).toBe(25);
      expect(Number(ultimo.stockResultante)).toBe(125);
      expect(ultimo.motivo).toBe('Compra de reposicion');
      expect(ultimo.usuario.id).toBe(esc.admin.id);
    });

    it('una salida no puede dejar el saldo en negativo', async () => {
      const repuesto = await crearRepuesto({ stockActual: 5 });

      const respuesta = await api()
        .post(`/api/repuestos/${repuesto.id}/salidas`)
        .set('Cookie', esc.admin.cookie)
        .send({ cantidad: 6, motivo: 'Merma' })
        .expect(422);

      expect(cuerpo<ErrorHttp>(respuesta).message).toContain('existencia');
      expect(Number((await leerRepuesto(repuesto.id)).stockActual)).toBe(5);
    });

    it('exige motivo: un movimiento sin explicacion vuelve inutil el libro', async () => {
      const repuesto = await crearRepuesto();

      await api()
        .post(`/api/repuestos/${repuesto.id}/entradas`)
        .set('Cookie', esc.admin.cookie)
        .send({ cantidad: 5 })
        .expect(400);
    });

    it('un tecnico no mueve almacen por su cuenta', async () => {
      const repuesto = await crearRepuesto();

      await api()
        .post(`/api/repuestos/${repuesto.id}/entradas`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ cantidad: 5, motivo: 'Intento' })
        .expect(403);
    });
  });

  // -------------------------------------------------------------------------
  // TCI-46 — consumo por orden
  // -------------------------------------------------------------------------

  describe('Consumo de repuestos en una orden', () => {
    it('el tecnico asignado imputa, y eso descuenta stock e imputa costo', async () => {
      const repuesto = await crearRepuesto({ costoUnitario: 100 });
      const orden = await crearOrden();

      const respuesta = await api()
        .post(`/api/ordenes/${orden.id}/repuestos`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ repuestoId: repuesto.id, cantidad: 3 })
        .expect(201);

      const linea = cuerpo<LineaConsumo>(respuesta);
      expect(Number(linea.cantidad)).toBe(3);
      expect(Number(linea.costoUnitario)).toBe(100);

      expect(Number((await leerRepuesto(repuesto.id)).stockActual)).toBe(97);

      const detalle = await api()
        .get(`/api/ordenes/${orden.id}`)
        .set('Cookie', esc.admin.cookie)
        .expect(200);
      expect(Number(cuerpo<OrdenDetalle>(detalle).costoRepuestos)).toBe(300);
      expect(Number(cuerpo<OrdenDetalle>(detalle).costoTotal)).toBe(300);
    });

    it('imputar dos veces el mismo repuesto acumula en una sola linea', async () => {
      const repuesto = await crearRepuesto();
      const orden = await crearOrden();

      await api()
        .post(`/api/ordenes/${orden.id}/repuestos`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ repuestoId: repuesto.id, cantidad: 2 })
        .expect(201);
      await api()
        .post(`/api/ordenes/${orden.id}/repuestos`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ repuestoId: repuesto.id, cantidad: 4 })
        .expect(201);

      const respuesta = await api()
        .get(`/api/ordenes/${orden.id}/repuestos`)
        .set('Cookie', esc.tecnico.cookie)
        .expect(200);

      const lineas = cuerpo<LineaConsumo[]>(respuesta);
      expect(lineas).toHaveLength(1);
      expect(Number(lineas[0].cantidad)).toBe(6);
      expect(Number((await leerRepuesto(repuesto.id)).stockActual)).toBe(94);
    });

    it('el costo unitario queda congelado aunque cambie el catalogo', async () => {
      const repuesto = await crearRepuesto({ costoUnitario: 100 });
      const orden = await crearOrden();

      await api()
        .post(`/api/ordenes/${orden.id}/repuestos`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ repuestoId: repuesto.id, cantidad: 2 })
        .expect(201);

      await api()
        .patch(`/api/repuestos/${repuesto.id}`)
        .set('Cookie', esc.admin.cookie)
        .send({ costoUnitario: 500 })
        .expect(200);

      const respuesta = await api()
        .get(`/api/ordenes/${orden.id}/repuestos`)
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      expect(Number(cuerpo<LineaConsumo[]>(respuesta)[0].costoUnitario)).toBe(
        100,
      );

      const detalle = await api()
        .get(`/api/ordenes/${orden.id}`)
        .set('Cookie', esc.admin.cookie)
        .expect(200);
      expect(Number(cuerpo<OrdenDetalle>(detalle).costoRepuestos)).toBe(200);
    });

    it('corregir a la baja devuelve la diferencia al almacen', async () => {
      const repuesto = await crearRepuesto({ costoUnitario: 10 });
      const orden = await crearOrden();

      const alta = await api()
        .post(`/api/ordenes/${orden.id}/repuestos`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ repuestoId: repuesto.id, cantidad: 8 })
        .expect(201);
      const linea = cuerpo<LineaConsumo>(alta);

      await api()
        .patch(`/api/ordenes/${orden.id}/repuestos/${linea.id}`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ cantidad: 3 })
        .expect(200);

      expect(Number((await leerRepuesto(repuesto.id)).stockActual)).toBe(97);

      const detalle = await api()
        .get(`/api/ordenes/${orden.id}`)
        .set('Cookie', esc.admin.cookie)
        .expect(200);
      expect(Number(cuerpo<OrdenDetalle>(detalle).costoRepuestos)).toBe(30);
    });

    it('retirar la linea devuelve todo y deja la orden sin costo de repuestos', async () => {
      const repuesto = await crearRepuesto({ costoUnitario: 10 });
      const orden = await crearOrden();

      const alta = await api()
        .post(`/api/ordenes/${orden.id}/repuestos`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ repuestoId: repuesto.id, cantidad: 5 })
        .expect(201);

      await api()
        .delete(
          `/api/ordenes/${orden.id}/repuestos/${cuerpo<LineaConsumo>(alta).id}`,
        )
        .set('Cookie', esc.tecnico.cookie)
        .expect(204);

      expect(Number((await leerRepuesto(repuesto.id)).stockActual)).toBe(100);

      const detalle = await api()
        .get(`/api/ordenes/${orden.id}`)
        .set('Cookie', esc.admin.cookie)
        .expect(200);
      expect(Number(cuerpo<OrdenDetalle>(detalle).costoRepuestos)).toBe(0);
    });

    it('no se puede imputar mas de lo que hay en almacen', async () => {
      const repuesto = await crearRepuesto({ stockActual: 2 });
      const orden = await crearOrden();

      await api()
        .post(`/api/ordenes/${orden.id}/repuestos`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ repuestoId: repuesto.id, cantidad: 3 })
        .expect(422);

      expect(Number((await leerRepuesto(repuesto.id)).stockActual)).toBe(2);
    });

    it('un tecnico ajeno a la orden no puede imputarle nada', async () => {
      const repuesto = await crearRepuesto();
      const orden = await crearOrden();

      await api()
        .post(`/api/ordenes/${orden.id}/repuestos`)
        .set('Cookie', esc.otroTecnico.cookie)
        .send({ repuestoId: repuesto.id, cantidad: 1 })
        .expect(403);
    });

    it('una orden cerrada no admite cambios en su consumo, ni de un admin', async () => {
      const repuesto = await crearRepuesto();
      const orden = await crearOrden();

      await api()
        .post(`/api/ordenes/${orden.id}/iniciar`)
        .set('Cookie', esc.tecnico.cookie)
        .send({})
        .expect(201);
      await api()
        .post(`/api/ordenes/${orden.id}/completar`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ trabajoRealizado: 'Cambio realizado sin repuestos.' })
        .expect(201);

      const respuesta = await api()
        .post(`/api/ordenes/${orden.id}/repuestos`)
        .set('Cookie', esc.admin.cookie)
        .send({ repuestoId: repuesto.id, cantidad: 1 })
        .expect(422);

      expect(cuerpo<ErrorHttp>(respuesta).message).toContain('Reabrala');
    });

    it('no deja borrar del catalogo un repuesto ya imputado', async () => {
      const repuesto = await crearRepuesto();
      const orden = await crearOrden();

      await api()
        .post(`/api/ordenes/${orden.id}/repuestos`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ repuestoId: repuesto.id, cantidad: 1 })
        .expect(201);

      const respuesta = await api()
        .delete(`/api/repuestos/${repuesto.id}`)
        .set('Cookie', esc.admin.cookie)
        .expect(422);

      expect(cuerpo<ErrorHttp>(respuesta).message).toContain('Desactivelo');
    });
  });

  // -------------------------------------------------------------------------
  // TCI-47 — alertas de minimos
  // -------------------------------------------------------------------------

  describe('Alertas de stock bajo', () => {
    it('avisa al llegar al minimo, no solo al bajar de el', async () => {
      const repuesto = await crearRepuesto({
        stockActual: 10,
        stockMinimo: 10,
      });

      const respuesta = await api()
        .get('/api/repuestos/alertas')
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      expect(cuerpo<Alerta[]>(respuesta).map((a) => a.id)).toContain(
        repuesto.id,
      );
    });

    it('un minimo de cero nunca avisa: es la forma de no controlar un repuesto', async () => {
      const repuesto = await crearRepuesto({ stockActual: 0, stockMinimo: 0 });

      const respuesta = await api()
        .get('/api/repuestos/alertas')
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      expect(cuerpo<Alerta[]>(respuesta).map((a) => a.id)).not.toContain(
        repuesto.id,
      );
    });

    it('el consumo de una orden deja el repuesto bajo minimo', async () => {
      const repuesto = await crearRepuesto({
        stockActual: 12,
        stockMinimo: 10,
      });
      const orden = await crearOrden();

      expect((await leerRepuesto(repuesto.id)).bajoMinimo).toBe(false);

      await api()
        .post(`/api/ordenes/${orden.id}/repuestos`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ repuestoId: repuesto.id, cantidad: 3 })
        .expect(201);

      expect((await leerRepuesto(repuesto.id)).bajoMinimo).toBe(true);

      const respuesta = await api()
        .get('/api/repuestos/alertas')
        .set('Cookie', esc.admin.cookie)
        .expect(200);
      expect(cuerpo<Alerta[]>(respuesta).map((a) => a.id)).toContain(
        repuesto.id,
      );
    });

    it('el filtro bajoMinimo del catalogo deja solo los que avisan', async () => {
      const enRiesgo = await crearRepuesto({ stockActual: 1, stockMinimo: 5 });
      const holgado = await crearRepuesto({ stockActual: 100, stockMinimo: 5 });

      const respuesta = await api()
        .get('/api/repuestos/admin')
        .query({ bajoMinimo: 'true' })
        .set('Cookie', esc.admin.cookie)
        .expect(200);

      const ids = cuerpo<RepuestoAdmin[]>(respuesta).map((r) => r.id);
      expect(ids).toContain(enRiesgo.id);
      expect(ids).not.toContain(holgado.id);
    });

    it('un tecnico no consulta las alertas: son una decision de compra', async () => {
      await api()
        .get('/api/repuestos/alertas')
        .set('Cookie', esc.tecnico.cookie)
        .expect(403);
    });
  });
});

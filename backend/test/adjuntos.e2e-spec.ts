import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AlmacenamientoService } from '../src/adjuntos/almacenamiento.service';
import { OrdenEstado, TipoHistorial } from '../src/generated/prisma/enums';
import { PrismaService } from '../src/prisma/prisma.service';
import { crearAppE2E } from './utils/app-e2e';
import {
  PNG_REAL,
  htmlDisfrazadoDeImagen,
  jpegDePrueba,
  pdfDePrueba,
  webpDePrueba,
} from './utils/archivos';
import { Escenario, sembrarEscenario } from './utils/escenario';
import { ErrorHttp, OrdenDetalle, cuerpo } from './utils/tipos';

interface AdjuntoRespuesta {
  id: string;
  ordenId: string;
  nombreArchivo: string;
  mimeType: string;
  tamanoBytes: number;
  tipo: string;
  createdAt: string;
  usuario: { id: string; name: string };
}

/**
 * TCI-43 — carga de evidencia en las ordenes de trabajo.
 *
 * Corre contra el MinIO real (el que configura S3_* en .env) y contra Postgres.
 * Todo lo que sube se borra en `esc.limpiar()`, que lee las claves de la base
 * antes de tirar las ordenes.
 */
describe('Adjuntos de ordenes (e2e)', () => {
  let app: INestApplication<App>;
  let esc: Escenario;
  let prisma: PrismaService;

  const api = () => request(app.getHttpServer());

  const crearOrden = async (): Promise<OrdenDetalle> => {
    const respuesta = await api()
      .post('/api/ordenes')
      .set('Cookie', esc.admin.cookie)
      .send({
        titulo: 'Orden con evidencia',
        descripcionProblema: 'El compresor pierde presion durante la noche.',
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

  /** Orden EN_PROCESO asignada al tecnico, que es el caso real de uso. */
  const ordenDelTecnico = async (): Promise<OrdenDetalle> => {
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

  const subir = (
    ordenId: string,
    cookie: string,
    archivo: Buffer,
    nombre: string,
    tipo?: string,
    mimeType = 'image/png',
  ) => {
    const peticion = api()
      .post(`/api/ordenes/${ordenId}/adjuntos`)
      .set('Cookie', cookie)
      .attach('archivo', archivo, { filename: nombre, contentType: mimeType });

    return tipo ? peticion.field('tipo', tipo) : peticion;
  };

  beforeAll(async () => {
    app = await crearAppE2E();
    esc = await sembrarEscenario(app);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await esc?.limpiar();
    await app?.close();
  });

  // -------------------------------------------------------------------------
  // Subida
  // -------------------------------------------------------------------------

  describe('POST /api/ordenes/:id/adjuntos', () => {
    it('el tecnico sube evidencia a su orden y queda en el historial', async () => {
      const orden = await ordenDelTecnico();

      const respuesta = await subir(
        orden.id,
        esc.tecnico.cookie,
        PNG_REAL,
        'Compresión final.png',
        'EVIDENCIA_DESPUES',
      ).expect(201);

      const adjunto = cuerpo<AdjuntoRespuesta>(respuesta);
      expect(adjunto.nombreArchivo).toBe('Compresión final.png');
      expect(adjunto.mimeType).toBe('image/png');
      expect(adjunto.tamanoBytes).toBe(PNG_REAL.length);
      expect(adjunto.tipo).toBe('EVIDENCIA_DESPUES');
      expect(adjunto.usuario.id).toBe(esc.tecnico.id);
      // La clave del objeto en MinIO no se expone nunca.
      expect(adjunto).not.toHaveProperty('clave');

      const detalle = cuerpo<OrdenDetalle>(
        await api()
          .get(`/api/ordenes/${orden.id}`)
          .set('Cookie', esc.tecnico.cookie)
          .expect(200),
      );
      expect(detalle.adjuntos).toHaveLength(1);

      const asiento = detalle.historial.at(-1);
      expect(asiento).toMatchObject({
        tipo: TipoHistorial.ADJUNTO,
        usuarioId: esc.tecnico.id,
        valorAnterior: null,
        valorNuevo: 'Compresión final.png',
      });
    });

    it('guarda el objeto en MinIO bajo una ruta ordenada por orden y tipo', async () => {
      const orden = await ordenDelTecnico();

      const adjunto = cuerpo<AdjuntoRespuesta>(
        await subir(
          orden.id,
          esc.tecnico.cookie,
          PNG_REAL,
          'tablero.png',
          'EVIDENCIA_ANTES',
        ).expect(201),
      );

      const fila = await prisma.ordenAdjunto.findUniqueOrThrow({
        where: { id: adjunto.id },
        select: { clave: true },
      });

      const anio = new Date().getFullYear();
      expect(fila.clave).toBe(
        `ordenes/${anio}/${orden.numero}/evidencia-antes/${adjunto.id}-tablero.png`,
      );
    });

    it('sanea el nombre en la clave pero conserva el original en la base', async () => {
      const orden = await ordenDelTecnico();

      const adjunto = cuerpo<AdjuntoRespuesta>(
        await subir(
          orden.id,
          esc.tecnico.cookie,
          PNG_REAL,
          'Evidencia #2 — cámara (después).PNG',
        ).expect(201),
      );

      expect(adjunto.nombreArchivo).toBe('Evidencia #2 — cámara (después).PNG');

      const fila = await prisma.ordenAdjunto.findUniqueOrThrow({
        where: { id: adjunto.id },
        select: { clave: true },
      });
      expect(fila.clave).toContain('/documentos/');
      expect(fila.clave).toMatch(/evidencia-2-camara-despues\.png$/);
    });

    it('sin `tipo` lo clasifica como DOCUMENTO', async () => {
      const orden = await ordenDelTecnico();

      const adjunto = cuerpo<AdjuntoRespuesta>(
        await subir(
          orden.id,
          esc.tecnico.cookie,
          pdfDePrueba(),
          'informe.pdf',
          undefined,
          'application/pdf',
        ).expect(201),
      );

      expect(adjunto.tipo).toBe('DOCUMENTO');
      expect(adjunto.mimeType).toBe('application/pdf');
    });

    it('acepta jpeg y webp', async () => {
      const orden = await ordenDelTecnico();

      const jpeg = cuerpo<AdjuntoRespuesta>(
        await subir(
          orden.id,
          esc.tecnico.cookie,
          jpegDePrueba(),
          'foto.jpg',
          'EVIDENCIA_ANTES',
          'image/jpeg',
        ).expect(201),
      );
      expect(jpeg.mimeType).toBe('image/jpeg');

      const webp = cuerpo<AdjuntoRespuesta>(
        await subir(
          orden.id,
          esc.tecnico.cookie,
          webpDePrueba(),
          'foto.webp',
          'EVIDENCIA_ANTES',
          'image/webp',
        ).expect(201),
      );
      expect(webp.mimeType).toBe('image/webp');
    });

    it('el admin puede adjuntar a cualquier orden', async () => {
      const orden = await ordenDelTecnico();

      await subir(
        orden.id,
        esc.admin.cookie,
        PNG_REAL,
        'del-admin.png',
        'DOCUMENTO',
      ).expect(201);
    });

    it('rechaza un HTML disfrazado de imagen mirando los bytes', async () => {
      const orden = await ordenDelTecnico();

      const respuesta = await subir(
        orden.id,
        esc.tecnico.cookie,
        htmlDisfrazadoDeImagen(),
        'inocente.png',
        'DOCUMENTO',
        'image/png', // el navegador puede declarar lo que quiera
      ).expect(422);

      expect(cuerpo<ErrorHttp>(respuesta).message).toContain(
        'no es de un tipo permitido',
      );

      // Y no dejo rastro ni en la base ni en MinIO.
      expect(
        await prisma.ordenAdjunto.count({ where: { ordenId: orden.id } }),
      ).toBe(0);
    });

    it('rechaza un archivo vacio', async () => {
      const orden = await ordenDelTecnico();

      await subir(
        orden.id,
        esc.tecnico.cookie,
        Buffer.alloc(0),
        'vacio.png',
      ).expect(422);
    });

    it('422 si no viene ningun archivo', async () => {
      const orden = await ordenDelTecnico();

      await api()
        .post(`/api/ordenes/${orden.id}/adjuntos`)
        .set('Cookie', esc.tecnico.cookie)
        .field('tipo', 'DOCUMENTO')
        .expect(422);
    });

    it('400 si el `tipo` no es del catalogo', async () => {
      const orden = await ordenDelTecnico();

      await subir(
        orden.id,
        esc.tecnico.cookie,
        PNG_REAL,
        'foto.png',
        'EVIDENCIA_LATERAL',
      ).expect(400);
    });

    it('403 si el tecnico no tiene la orden asignada', async () => {
      const orden = await ordenDelTecnico();

      await subir(
        orden.id,
        esc.otroTecnico.cookie,
        PNG_REAL,
        'ajena.png',
        'DOCUMENTO',
      ).expect(403);
    });

    it('401 sin sesion', async () => {
      const orden = await ordenDelTecnico();

      await api()
        .post(`/api/ordenes/${orden.id}/adjuntos`)
        .attach('archivo', PNG_REAL, { filename: 'x.png' })
        .expect(401);
    });

    it('404 si la orden no existe', async () => {
      await subir(
        'cly0000000000000000000000',
        esc.admin.cookie,
        PNG_REAL,
        'foto.png',
      ).expect(404);
    });

    it('422 al adjuntar a una orden ya completada', async () => {
      const orden = await ordenDelTecnico();
      await api()
        .post(`/api/ordenes/${orden.id}/completar`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ trabajoRealizado: 'Se ajusto la valvula y se probo en carga.' })
        .expect(201);

      const respuesta = await subir(
        orden.id,
        esc.admin.cookie,
        PNG_REAL,
        'tardia.png',
        'DOCUMENTO',
      ).expect(422);

      expect(cuerpo<ErrorHttp>(respuesta).message).toContain(
        'Reabrala primero',
      );
    });
  });

  // -------------------------------------------------------------------------
  // Descarga
  // -------------------------------------------------------------------------

  describe('GET /api/ordenes/:id/adjuntos/:adjuntoId', () => {
    it('devuelve la imagen byte a byte, en linea y sin sniffing', async () => {
      const orden = await ordenDelTecnico();
      const adjunto = cuerpo<AdjuntoRespuesta>(
        await subir(
          orden.id,
          esc.tecnico.cookie,
          PNG_REAL,
          'evidencia.png',
          'EVIDENCIA_DESPUES',
        ).expect(201),
      );

      const respuesta = await api()
        .get(`/api/ordenes/${orden.id}/adjuntos/${adjunto.id}`)
        .set('Cookie', esc.tecnico.cookie)
        .buffer(true)
        .parse((res, callback) => {
          const trozos: Buffer[] = [];
          res.on('data', (t: Buffer) => trozos.push(t));
          res.on('end', () => callback(null, Buffer.concat(trozos)));
        })
        .expect(200);

      expect(respuesta.headers['content-type']).toContain('image/png');
      expect(respuesta.headers['x-content-type-options']).toBe('nosniff');
      expect(respuesta.headers['content-disposition']).toContain('inline');
      expect(respuesta.headers['content-disposition']).toContain(
        'evidencia.png',
      );
      expect(Buffer.compare(respuesta.body as Buffer, PNG_REAL)).toBe(0);
    });

    it('un PDF se entrega como descarga, no en linea', async () => {
      const orden = await ordenDelTecnico();
      const adjunto = cuerpo<AdjuntoRespuesta>(
        await subir(
          orden.id,
          esc.tecnico.cookie,
          pdfDePrueba(),
          'manual.pdf',
          'DOCUMENTO',
          'application/pdf',
        ).expect(201),
      );

      const respuesta = await api()
        .get(`/api/ordenes/${orden.id}/adjuntos/${adjunto.id}`)
        .set('Cookie', esc.tecnico.cookie)
        .expect(200);

      expect(respuesta.headers['content-disposition']).toContain('attachment');
    });

    it('403 si lo pide un tecnico que no tiene la orden', async () => {
      const orden = await ordenDelTecnico();
      const adjunto = cuerpo<AdjuntoRespuesta>(
        await subir(orden.id, esc.tecnico.cookie, PNG_REAL, 'x.png').expect(
          201,
        ),
      );

      await api()
        .get(`/api/ordenes/${orden.id}/adjuntos/${adjunto.id}`)
        .set('Cookie', esc.otroTecnico.cookie)
        .expect(403);
    });

    it('401 sin sesion: el bucket nunca queda expuesto', async () => {
      const orden = await ordenDelTecnico();
      const adjunto = cuerpo<AdjuntoRespuesta>(
        await subir(orden.id, esc.tecnico.cookie, PNG_REAL, 'x.png').expect(
          201,
        ),
      );

      await api()
        .get(`/api/ordenes/${orden.id}/adjuntos/${adjunto.id}`)
        .expect(401);
    });

    it('404 si el adjunto es de otra orden', async () => {
      const unaOrden = await ordenDelTecnico();
      const otraOrden = await ordenDelTecnico();
      const adjunto = cuerpo<AdjuntoRespuesta>(
        await subir(unaOrden.id, esc.tecnico.cookie, PNG_REAL, 'x.png').expect(
          201,
        ),
      );

      await api()
        .get(`/api/ordenes/${otraOrden.id}/adjuntos/${adjunto.id}`)
        .set('Cookie', esc.tecnico.cookie)
        .expect(404);
    });

    it('se puede descargar aunque la orden ya este cerrada', async () => {
      const orden = await ordenDelTecnico();
      const adjunto = cuerpo<AdjuntoRespuesta>(
        await subir(
          orden.id,
          esc.tecnico.cookie,
          PNG_REAL,
          'cierre.png',
          'EVIDENCIA_DESPUES',
        ).expect(201),
      );
      await api()
        .post(`/api/ordenes/${orden.id}/completar`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ trabajoRealizado: 'Trabajo terminado y probado en sitio.' })
        .expect(201);

      await api()
        .get(`/api/ordenes/${orden.id}/adjuntos/${adjunto.id}`)
        .set('Cookie', esc.tecnico.cookie)
        .expect(200);
    });
  });

  // -------------------------------------------------------------------------
  // Borrado
  // -------------------------------------------------------------------------

  describe('DELETE /api/ordenes/:id/adjuntos/:adjuntoId', () => {
    it('el tecnico retira lo que subio y queda constancia en el historial', async () => {
      const orden = await ordenDelTecnico();
      const adjunto = cuerpo<AdjuntoRespuesta>(
        await subir(
          orden.id,
          esc.tecnico.cookie,
          PNG_REAL,
          'equivocada.png',
          'EVIDENCIA_ANTES',
        ).expect(201),
      );

      await api()
        .delete(`/api/ordenes/${orden.id}/adjuntos/${adjunto.id}`)
        .set('Cookie', esc.tecnico.cookie)
        .expect(204);

      const detalle = cuerpo<OrdenDetalle>(
        await api()
          .get(`/api/ordenes/${orden.id}`)
          .set('Cookie', esc.tecnico.cookie)
          .expect(200),
      );
      expect(detalle.adjuntos).toHaveLength(0);

      // Es lo unico que queda del archivo: por eso el asiento va si o si.
      expect(detalle.historial.at(-1)).toMatchObject({
        tipo: TipoHistorial.ADJUNTO,
        valorAnterior: 'equivocada.png',
        valorNuevo: null,
      });

      // Y el objeto desaparecio de MinIO.
      const almacenamiento = app.get(AlmacenamientoService);
      await expect(
        almacenamiento.leer(
          `ordenes/${new Date().getFullYear()}/${orden.numero}/evidencia-antes/${adjunto.id}-equivocada.png`,
        ),
      ).rejects.toThrow();
    });

    it('403 si un tecnico intenta borrar lo que subio otro', async () => {
      const orden = await ordenDelTecnico();
      const delAdmin = cuerpo<AdjuntoRespuesta>(
        await subir(
          orden.id,
          esc.admin.cookie,
          PNG_REAL,
          'del-admin.png',
        ).expect(201),
      );

      const respuesta = await api()
        .delete(`/api/ordenes/${orden.id}/adjuntos/${delAdmin.id}`)
        .set('Cookie', esc.tecnico.cookie)
        .expect(403);

      expect(cuerpo<ErrorHttp>(respuesta).message).toContain(
        'los archivos que usted subio',
      );
    });

    it('el admin si puede retirar lo que subio el tecnico', async () => {
      const orden = await ordenDelTecnico();
      const adjunto = cuerpo<AdjuntoRespuesta>(
        await subir(orden.id, esc.tecnico.cookie, PNG_REAL, 'x.png').expect(
          201,
        ),
      );

      await api()
        .delete(`/api/ordenes/${orden.id}/adjuntos/${adjunto.id}`)
        .set('Cookie', esc.admin.cookie)
        .expect(204);
    });

    it('422 si la orden ya esta cerrada: la evidencia es parte del acta', async () => {
      const orden = await ordenDelTecnico();
      const adjunto = cuerpo<AdjuntoRespuesta>(
        await subir(
          orden.id,
          esc.tecnico.cookie,
          PNG_REAL,
          'evidencia.png',
          'EVIDENCIA_DESPUES',
        ).expect(201),
      );
      await api()
        .post(`/api/ordenes/${orden.id}/completar`)
        .set('Cookie', esc.tecnico.cookie)
        .send({ trabajoRealizado: 'Se completo el mantenimiento programado.' })
        .expect(201);

      await api()
        .delete(`/api/ordenes/${orden.id}/adjuntos/${adjunto.id}`)
        .set('Cookie', esc.admin.cookie)
        .expect(422);

      // Sigue ahi.
      expect(
        await prisma.ordenAdjunto.count({ where: { id: adjunto.id } }),
      ).toBe(1);
    });

    it('404 al borrar dos veces', async () => {
      const orden = await ordenDelTecnico();
      const adjunto = cuerpo<AdjuntoRespuesta>(
        await subir(orden.id, esc.tecnico.cookie, PNG_REAL, 'x.png').expect(
          201,
        ),
      );

      await api()
        .delete(`/api/ordenes/${orden.id}/adjuntos/${adjunto.id}`)
        .set('Cookie', esc.tecnico.cookie)
        .expect(204);
      await api()
        .delete(`/api/ordenes/${orden.id}/adjuntos/${adjunto.id}`)
        .set('Cookie', esc.tecnico.cookie)
        .expect(404);
    });
  });

  // -------------------------------------------------------------------------
  // Interaccion con el cierre (regla 4 de docs/flujo-ordenes.md)
  // -------------------------------------------------------------------------

  describe('cierre de la orden', () => {
    it('con EVIDENCIA_OBLIGATORIA apagada se puede completar sin adjuntos', async () => {
      // Es el valor por defecto y la decision vigente: la carga funciona pero
      // todavia no bloquea el cierre.
      expect(process.env.EVIDENCIA_OBLIGATORIA).not.toBe('true');

      const orden = await ordenDelTecnico();

      const completada = cuerpo<OrdenDetalle>(
        await api()
          .post(`/api/ordenes/${orden.id}/completar`)
          .set('Cookie', esc.tecnico.cookie)
          .send({ trabajoRealizado: 'Se reviso el equipo y quedo operando.' })
          .expect(201),
      );

      expect(completada.estado).toBe(OrdenEstado.COMPLETADA);
      expect(completada.adjuntos).toHaveLength(0);
    });
  });
});

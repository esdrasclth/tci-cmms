import { Readable } from 'node:stream';

import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import type { UsuarioActual } from '../auth/usuario-actual';
import {
  OrdenEstado,
  Rol,
  TipoAdjunto,
  TipoHistorial,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AlmacenamientoService } from './almacenamiento.service';
import { construirClave } from './clave-objeto';
import { nombreOriginal } from './nombre-original';
import {
  FormatoPermitido,
  MIMES_PERMITIDOS,
  detectarFormato,
  formatoDe,
} from './tipos-permitidos';

/** Tope por archivo. 10 MB cubre de sobra una foto de telefono ya reducida. */
const MAX_BYTES = Number(process.env.ADJUNTOS_MAX_BYTES ?? 10 * 1024 * 1024);

/** Lo que se devuelve de un adjunto: nunca la clave del objeto en MinIO. */
const CAMPOS_PUBLICOS = {
  id: true,
  ordenId: true,
  nombreArchivo: true,
  mimeType: true,
  tamanoBytes: true,
  tipo: true,
  createdAt: true,
  usuario: { select: { id: true, name: true } },
};

export interface ArchivoRecibido {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class AdjuntosService {
  private readonly log = new Logger(AdjuntosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly almacenamiento: AlmacenamientoService,
  ) {}

  static get maxBytes(): number {
    return MAX_BYTES;
  }

  // -------------------------------------------------------------------------
  // Subir
  // -------------------------------------------------------------------------

  async subir(
    ordenId: string,
    archivo: ArchivoRecibido | undefined,
    tipo: TipoAdjunto | undefined,
    usuario: UsuarioActual,
  ) {
    if (!archivo) {
      throw new UnprocessableEntityException(
        'No se recibio ningun archivo en el campo `archivo`.',
      );
    }

    const orden = await this.ordenAccesible(ordenId, usuario);
    this.exigirOrdenAbierta(orden.estado, 'adjuntar evidencia a');

    const formato = this.validarArchivo(archivo);
    const nombre = nombreOriginal(archivo.originalname);

    // El id se genera antes de escribir en MinIO para que forme parte de la
    // clave: asi dos fotos con el mismo nombre no se pisan.
    const id = crearId();
    const clave = construirClave({
      numeroOrden: orden.numero,
      tipo: tipo ?? TipoAdjunto.DOCUMENTO,
      idAdjunto: id,
      nombreArchivo: nombre,
    });

    // Primero MinIO y despues la base: si la escritura en MinIO falla, no
    // queremos una fila que apunte a un objeto inexistente. Al reves el peor
    // caso es un objeto huerfano, que no rompe nada.
    await this.almacenamiento.guardar(
      clave,
      archivo.buffer,
      formato.mimeType,
      nombre,
    );

    try {
      return await this.prisma.$transaction(async (tx) => {
        const adjunto = await tx.ordenAdjunto.create({
          data: {
            id,
            ordenId,
            usuarioId: usuario.id,
            clave,
            nombreArchivo: nombre.slice(0, 255),
            mimeType: formato.mimeType,
            tamanoBytes: archivo.size,
            tipo: tipo ?? TipoAdjunto.DOCUMENTO,
          },
          select: CAMPOS_PUBLICOS,
        });

        await tx.ordenHistorial.create({
          data: {
            ordenId,
            usuarioId: usuario.id,
            tipo: TipoHistorial.ADJUNTO,
            campo: 'adjunto',
            valorAnterior: null,
            valorNuevo: adjunto.nombreArchivo,
            comentario: `Adjunto ${etiqueta(adjunto.tipo)}: ${adjunto.nombreArchivo}`,
          },
        });

        return adjunto;
      });
    } catch (error) {
      // La fila no se creo: el objeto en MinIO ya no le sirve a nadie.
      await this.almacenamiento.eliminar(clave).catch((fallo: unknown) => {
        this.log.error(
          `Quedo un objeto huerfano en MinIO: ${clave}. Borrarlo a mano.`,
          fallo,
        );
      });
      throw error;
    }
  }

  // -------------------------------------------------------------------------
  // Descargar
  // -------------------------------------------------------------------------

  async descargar(
    ordenId: string,
    adjuntoId: string,
    usuario: UsuarioActual,
  ): Promise<{
    stream: Readable;
    nombreArchivo: string;
    mimeType: string;
    tamanoBytes: number;
    enLinea: boolean;
  }> {
    await this.ordenAccesible(ordenId, usuario);

    const adjunto = await this.prisma.ordenAdjunto.findFirst({
      where: { id: adjuntoId, ordenId },
    });
    if (!adjunto) {
      throw new NotFoundException(`No existe el adjunto ${adjuntoId}.`);
    }

    return {
      stream: await this.almacenamiento.leer(adjunto.clave),
      nombreArchivo: adjunto.nombreArchivo,
      mimeType: adjunto.mimeType,
      tamanoBytes: adjunto.tamanoBytes,
      // Si el mimeType guardado ya no esta en la lista (porque se retiro de
      // FORMATOS despues de subirlo), se fuerza la descarga.
      enLinea: formatoDe(adjunto.mimeType)?.enLinea ?? false,
    };
  }

  // -------------------------------------------------------------------------
  // Eliminar
  // -------------------------------------------------------------------------

  async eliminar(
    ordenId: string,
    adjuntoId: string,
    usuario: UsuarioActual,
  ): Promise<void> {
    const orden = await this.ordenAccesible(ordenId, usuario);
    this.exigirOrdenAbierta(orden.estado, 'eliminar evidencia de');

    const adjunto = await this.prisma.ordenAdjunto.findFirst({
      where: { id: adjuntoId, ordenId },
    });
    if (!adjunto) {
      throw new NotFoundException(`No existe el adjunto ${adjuntoId}.`);
    }

    // Un tecnico solo retira lo que el mismo subio; un admin, cualquier cosa.
    if (usuario.rol !== Rol.ADMIN && adjunto.usuarioId !== usuario.id) {
      throw new ForbiddenException(
        'Solo puede eliminar los archivos que usted subio.',
      );
    }

    // El asiento va antes de borrar: es lo unico que quedara del archivo.
    await this.prisma.$transaction(async (tx) => {
      await tx.ordenHistorial.create({
        data: {
          ordenId,
          usuarioId: usuario.id,
          tipo: TipoHistorial.ADJUNTO,
          campo: 'adjunto',
          valorAnterior: adjunto.nombreArchivo,
          valorNuevo: null,
          comentario: `Elimino el adjunto: ${adjunto.nombreArchivo}`,
        },
      });
      await tx.ordenAdjunto.delete({ where: { id: adjuntoId } });
    });

    // MinIO al final: si falla, la fila ya no existe y el objeto queda
    // huerfano, que es preferible a un adjunto listado que ya no se puede abrir.
    await this.almacenamiento
      .eliminar(adjunto.clave)
      .catch((fallo: unknown) => {
        this.log.error(
          `Quedo un objeto huerfano en MinIO: ${adjunto.clave}. Borrarlo a mano.`,
          fallo,
        );
      });
  }

  // -------------------------------------------------------------------------
  // Reglas compartidas
  // -------------------------------------------------------------------------

  /**
   * Misma regla que para ver el detalle de la orden (TCI-25): el admin, o el
   * tecnico que la tiene asignada. Se comprueba aqui y no en un guard porque
   * depende de la orden concreta.
   */
  private async ordenAccesible(ordenId: string, usuario: UsuarioActual) {
    const orden = await this.prisma.ordenTrabajo.findFirst({
      where: { id: ordenId, deletedAt: null },
      select: { id: true, numero: true, estado: true, tecnicoId: true },
    });
    if (!orden) {
      throw new NotFoundException(`No existe la orden ${ordenId}.`);
    }
    if (usuario.rol !== Rol.ADMIN && orden.tecnicoId !== usuario.id) {
      throw new ForbiddenException('Esta orden no esta asignada a usted.');
    }
    return orden;
  }

  /**
   * Una orden cerrada no admite cambios en su evidencia, ni siquiera de un
   * admin: la evidencia es parte del acta de cierre. Para corregirla hay que
   * reabrir la orden, que deja rastro en el historial (TCI-78).
   */
  private exigirOrdenAbierta(estado: OrdenEstado, accion: string): void {
    if (estado === OrdenEstado.COMPLETADA || estado === OrdenEstado.CANCELADA) {
      throw new UnprocessableEntityException(
        `No se puede ${accion} una orden ${estado}. Reabrala primero.`,
      );
    }
  }

  private validarArchivo(archivo: ArchivoRecibido): FormatoPermitido {
    if (archivo.size === 0) {
      throw new UnprocessableEntityException('El archivo esta vacio.');
    }
    if (archivo.size > MAX_BYTES) {
      throw new UnprocessableEntityException(
        `El archivo pesa ${mb(archivo.size)} MB y el maximo es ${mb(MAX_BYTES)} MB.`,
      );
    }

    // El tipo real lo dicen los bytes, no la cabecera que manda el navegador.
    const formato = detectarFormato(archivo.buffer);
    if (!formato) {
      throw new UnprocessableEntityException(
        `El archivo no es de un tipo permitido. Se aceptan: ${MIMES_PERMITIDOS.join(', ')}.`,
      );
    }

    return formato;
  }
}

/** Los cuid los genera Prisma; aqui hace falta uno antes de insertar. */
function crearId(): string {
  return `adj${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

function mb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

function etiqueta(tipo: TipoAdjunto): string {
  switch (tipo) {
    case TipoAdjunto.EVIDENCIA_ANTES:
      return 'de evidencia (antes)';
    case TipoAdjunto.EVIDENCIA_DESPUES:
      return 'de evidencia (despues)';
    default:
      return 'documento';
  }
}

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import {
  EventoNotificable,
  OrdenEstado,
  OrigenOrden,
  Prioridad,
  Rol,
  TipoAdjunto,
  TipoHistorial,
} from '../generated/prisma/enums';
import type { UsuarioActual } from '../auth/usuario-actual';
import { PrismaService } from '../prisma/prisma.service';
import { CompletarOrdenDto } from './dto/acciones.dto';
import { ActualizarOrdenDto } from './dto/actualizar-orden.dto';
import { CrearOrdenDto } from './dto/crear-orden.dto';
import { FiltrarOrdenesDto } from './dto/filtrar-ordenes.dto';
import { AccionOrden, OrdenEstadoService } from './orden-estado.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { OrdenesEventosService } from './ordenes-eventos.service';
import { defer, switchMap, type Observable } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';

export type { UsuarioActual } from '../auth/usuario-actual';

/**
 * Regla 4 de docs/flujo-ordenes.md: la evidencia para cerrar es configurable.
 * Queda apagada por defecto hasta que exista la carga de adjuntos (TCI-43); si
 * se encendiera ahora, ninguna orden podria completarse.
 */
const EVIDENCIA_OBLIGATORIA = process.env.EVIDENCIA_OBLIGATORIA === 'true';

const INCLUDE_LISTA = {
  cliente: { select: { id: true, nombre: true } },
  sede: { select: { id: true, nombre: true, ciudad: true } },
  equipo: { select: { id: true, codigo: true, nombre: true } },
  tipoMantenimiento: {
    select: { id: true, codigo: true, nombre: true, color: true },
  },
  tecnico: { select: { id: true, name: true, email: true } },
} satisfies Prisma.OrdenTrabajoInclude;

const INCLUDE_DETALLE = {
  ...INCLUDE_LISTA,
  creadoPor: { select: { id: true, name: true, email: true } },
  historial: {
    orderBy: { createdAt: 'asc' },
    include: { usuario: { select: { id: true, name: true } } },
  },
  // Sin `clave`: es la ruta del objeto en MinIO y no le sirve al cliente, que
  // pide el archivo por GET /ordenes/:id/adjuntos/:adjuntoId (TCI-43).
  adjuntos: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      nombreArchivo: true,
      mimeType: true,
      tamanoBytes: true,
      tipo: true,
      createdAt: true,
      usuario: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.OrdenTrabajoInclude;

@Injectable()
export class OrdenesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly estados: OrdenEstadoService,
    private readonly eventos: OrdenesEventosService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  // -------------------------------------------------------------------------
  // TCI-24 — crear
  // -------------------------------------------------------------------------

  async crear(dto: CrearOrdenDto, usuario: UsuarioActual) {
    const tipo = await this.prisma.tipoMantenimiento.findUnique({
      where: { id: dto.tipoMantenimientoId },
    });
    if (!tipo || !tipo.activo) {
      throw new UnprocessableEntityException(
        'El tipo de mantenimiento no existe o esta inactivo.',
      );
    }

    // Regla 3 del modelo de datos (TCI-22).
    if (tipo.requiereEquipo && !dto.equipoId) {
      throw new UnprocessableEntityException(
        `El tipo de mantenimiento '${tipo.nombre}' exige indicar un equipo.`,
      );
    }

    const cliente = await this.prisma.cliente.findFirst({
      where: { id: dto.clienteId, deletedAt: null },
    });
    if (!cliente || !cliente.activo) {
      throw new UnprocessableEntityException(
        'El cliente no existe o esta inactivo.',
      );
    }

    if (dto.sedeId) {
      const sede = await this.prisma.sede.findFirst({
        where: { id: dto.sedeId, deletedAt: null },
      });
      if (!sede) {
        throw new UnprocessableEntityException('La sede no existe.');
      }
      if (sede.clienteId !== cliente.id) {
        throw new UnprocessableEntityException(
          'La sede no pertenece al cliente indicado.',
        );
      }
    }

    if (dto.equipoId) {
      const equipo = await this.prisma.equipo.findFirst({
        where: { id: dto.equipoId, deletedAt: null },
      });
      if (!equipo) {
        throw new UnprocessableEntityException('El equipo no existe.');
      }
      if (equipo.clienteId !== cliente.id) {
        throw new UnprocessableEntityException(
          'El equipo no pertenece al cliente indicado.',
        );
      }
      if (dto.sedeId && equipo.sedeId && equipo.sedeId !== dto.sedeId) {
        throw new UnprocessableEntityException(
          'El equipo esta registrado en otra sede del cliente.',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const numero = await this.generarNumero(tx);

      const creada = await tx.ordenTrabajo.create({
        data: {
          numero,
          titulo: dto.titulo,
          descripcionProblema: dto.descripcionProblema,
          prioridad: dto.prioridad,
          clienteId: dto.clienteId,
          sedeId: dto.sedeId,
          equipoId: dto.equipoId,
          tipoMantenimientoId: dto.tipoMantenimientoId,
          creadoPorId: usuario.id,
          fechaProgramada: dto.fechaProgramada
            ? new Date(dto.fechaProgramada)
            : undefined,
          fechaLimite: dto.fechaLimite ? new Date(dto.fechaLimite) : undefined,
        },
        select: { id: true },
      });

      // Regla 6: el historial arranca con el alta.
      await tx.ordenHistorial.create({
        data: {
          ordenId: creada.id,
          usuarioId: usuario.id,
          tipo: TipoHistorial.CAMBIO_ESTADO,
          estadoAnterior: null,
          estadoNuevo: OrdenEstado.PENDIENTE,
          comentario: 'Orden creada',
        },
      });

      return this.releer(tx, creada.id);
    });
  }

  /**
   * TCI-50 — alta generada por un plan preventivo.
   *
   * Vive aqui y no en el generador para que el correlativo, el asiento inicial
   * del historial y el resto de convenciones del alta se escriban en un solo
   * sitio. Se salta las validaciones de `crear()` a proposito: el plan ya
   * comprobo sus referencias al definirse, y este camino no lo dispara un
   * usuario que pueda equivocarse.
   *
   * `creadoPorId` apunta al usuario de sistema: la orden no tiene autor humano,
   * pero la columna es obligatoria y el historial necesita a quien atribuir el
   * asiento.
   */
  async crearDesdePlan(
    tx: Prisma.TransactionClient,
    datos: {
      titulo: string;
      descripcionProblema: string;
      clienteId: string;
      sedeId: string | null;
      equipoId: string;
      tipoMantenimientoId: string;
      prioridad: Prioridad;
      planId: string;
      fechaProgramada: Date;
      creadoPorId: string;
    },
  ): Promise<{ id: string; numero: string }> {
    const numero = await this.generarNumero(tx);

    const creada = await tx.ordenTrabajo.create({
      data: {
        numero,
        titulo: datos.titulo,
        descripcionProblema: datos.descripcionProblema,
        prioridad: datos.prioridad,
        origen: OrigenOrden.PREVENTIVO_AUTOMATICO,
        clienteId: datos.clienteId,
        sedeId: datos.sedeId,
        equipoId: datos.equipoId,
        tipoMantenimientoId: datos.tipoMantenimientoId,
        planId: datos.planId,
        creadoPorId: datos.creadoPorId,
        fechaProgramada: datos.fechaProgramada,
      },
      select: { id: true, numero: true },
    });

    await tx.ordenHistorial.create({
      data: {
        ordenId: creada.id,
        usuarioId: datos.creadoPorId,
        tipo: TipoHistorial.CAMBIO_ESTADO,
        estadoAnterior: null,
        estadoNuevo: OrdenEstado.PENDIENTE,
        comentario: 'Orden generada automaticamente por un plan preventivo',
      },
    });

    return creada;
  }

  /**
   * Correlativo legible `OT-{anio}-{NNNN}`, unico y por anio (regla 1 de
   * docs/modelo-datos-orden.md).
   *
   * El lock de asesoria a nivel de transaccion serializa solo a quienes crean
   * ordenes del mismo anio y se libera al terminar la transaccion. Sin el, dos
   * altas simultaneas leerian el mismo maximo y una fallaria contra el indice
   * unico de `numero`.
   */
  private async generarNumero(tx: Prisma.TransactionClient): Promise<string> {
    const anio = new Date().getFullYear();
    const prefijo = `OT-${anio}-`;

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`orden_numero_${anio}`}))`;

    // Sin filtro de deletedAt a proposito: una orden borrada logicamente sigue
    // ocupando su numero y no se debe reutilizar.
    const filas = await tx.$queryRaw<{ numero: string }[]>`
      SELECT numero FROM ordenes_trabajo
      WHERE numero LIKE ${`${prefijo}%`}
      ORDER BY numero DESC
      LIMIT 1
    `;

    const ultimo = filas[0]
      ? Number.parseInt(filas[0].numero.slice(prefijo.length), 10)
      : 0;

    return `${prefijo}${String(ultimo + 1).padStart(4, '0')}`;
  }

  // -------------------------------------------------------------------------
  // TCI-25 — listar / filtrar
  // -------------------------------------------------------------------------

  async listar(filtros: FiltrarOrdenesDto, usuario: UsuarioActual) {
    // Regla 5: el soft delete es invisible por defecto.
    const where: Prisma.OrdenTrabajoWhereInput = { deletedAt: null };

    // Regla 3: un tecnico solo ve sus propias ordenes, mande lo que mande en el
    // filtro. Un admin si puede filtrar por tecnico.
    if (usuario.rol !== Rol.ADMIN) {
      where.tecnicoId = usuario.id;
    } else if (filtros.tecnicoId) {
      where.tecnicoId = filtros.tecnicoId;
    }

    if (filtros.estado?.length) where.estado = { in: filtros.estado };
    if (filtros.prioridad?.length) where.prioridad = { in: filtros.prioridad };
    if (filtros.clienteId) where.clienteId = filtros.clienteId;
    if (filtros.sedeId) where.sedeId = filtros.sedeId;
    if (filtros.equipoId) where.equipoId = filtros.equipoId;
    if (filtros.tipoMantenimientoId) {
      where.tipoMantenimientoId = filtros.tipoMantenimientoId;
    }

    if (filtros.desde || filtros.hasta) {
      where.fechaProgramada = {
        gte: filtros.desde ? new Date(filtros.desde) : undefined,
        lte: filtros.hasta ? new Date(filtros.hasta) : undefined,
      };
    }

    if (filtros.q?.trim()) {
      const q = filtros.q.trim();
      where.OR = [
        { numero: { contains: q, mode: 'insensitive' } },
        { titulo: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.ordenTrabajo.count({ where }),
      this.prisma.ordenTrabajo.findMany({
        where,
        include: INCLUDE_LISTA,
        orderBy: { [filtros.orderBy]: filtros.orden },
        skip: (filtros.page - 1) * filtros.perPage,
        take: filtros.perPage,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page: filtros.page,
        perPage: filtros.perPage,
        totalPages: Math.ceil(total / filtros.perPage),
      },
    };
  }

  async obtener(id: string, usuario: UsuarioActual) {
    const orden = await this.prisma.ordenTrabajo.findFirst({
      where: { id, deletedAt: null },
      include: INCLUDE_DETALLE,
    });

    if (!orden) {
      throw new NotFoundException(`No existe la orden ${id}.`);
    }
    if (usuario.rol !== Rol.ADMIN && orden.tecnicoId !== usuario.id) {
      throw new ForbiddenException('Esta orden no esta asignada a usted.');
    }

    return {
      ...orden,
      // El frontend pinta botones a partir de esto (TCI-78 regla 2).
      accionesDisponibles: this.estados.accionesDisponibles(
        orden.estado,
        usuario.rol,
        usuario.id,
        orden.tecnicoId,
      ),
    };
  }

  /**
   * Abre el stream solo despues de aplicar la misma autorizacion del detalle.
   * `defer` evita consultar la orden hasta que Nest suscribe el SSE.
   */
  escuchar(id: string, usuario: UsuarioActual): Observable<MessageEvent> {
    return defer(() => this.obtener(id, usuario)).pipe(
      switchMap(() => this.eventos.escuchar(id)),
    );
  }

  // -------------------------------------------------------------------------
  // TCI-26 — actualizar
  // -------------------------------------------------------------------------

  async actualizar(
    id: string,
    dto: ActualizarOrdenDto,
    usuario: UsuarioActual,
  ) {
    if (usuario.rol !== Rol.ADMIN) {
      throw new ForbiddenException(
        'Solo un administrador puede editar los datos de una orden.',
      );
    }

    const orden = await this.prisma.ordenTrabajo.findFirst({
      where: { id, deletedAt: null },
    });
    if (!orden) {
      throw new NotFoundException(`No existe la orden ${id}.`);
    }
    if (
      orden.estado === OrdenEstado.COMPLETADA ||
      orden.estado === OrdenEstado.CANCELADA
    ) {
      throw new UnprocessableEntityException(
        `No se puede editar una orden ${orden.estado}. Reabrala primero.`,
      );
    }

    if (dto.tipoMantenimientoId) {
      const tipo = await this.prisma.tipoMantenimiento.findUnique({
        where: { id: dto.tipoMantenimientoId },
      });
      if (!tipo || !tipo.activo) {
        throw new UnprocessableEntityException(
          'El tipo de mantenimiento no existe o esta inactivo.',
        );
      }
      const equipoFinal = dto.equipoId ?? orden.equipoId;
      if (tipo.requiereEquipo && !equipoFinal) {
        throw new UnprocessableEntityException(
          `El tipo de mantenimiento '${tipo.nombre}' exige indicar un equipo.`,
        );
      }
    }

    if (dto.sedeId) {
      const sede = await this.prisma.sede.findFirst({
        where: { id: dto.sedeId, deletedAt: null },
      });
      if (!sede || sede.clienteId !== orden.clienteId) {
        throw new UnprocessableEntityException(
          'La sede no existe o no pertenece al cliente de la orden.',
        );
      }
    }

    if (dto.equipoId) {
      const equipo = await this.prisma.equipo.findFirst({
        where: { id: dto.equipoId, deletedAt: null },
      });
      if (!equipo || equipo.clienteId !== orden.clienteId) {
        throw new UnprocessableEntityException(
          'El equipo no existe o no pertenece al cliente de la orden.',
        );
      }
    }

    const data: Prisma.OrdenTrabajoUncheckedUpdateInput = {};
    const cambios: { campo: string; anterior: string; nuevo: string }[] = [];

    // El historial guarda texto plano: las fechas van en ISO para que el "antes"
    // se pueda comparar y reconstruir sin ambiguedad de zona horaria.
    type ValorAuditable = string | Date | null;
    const texto = (valor: ValorAuditable): string =>
      valor instanceof Date ? valor.toISOString() : (valor ?? '');

    const registrar = (
      campo: string,
      anterior: ValorAuditable,
      nuevo: ValorAuditable,
    ) => {
      const a = texto(anterior);
      const n = texto(nuevo);
      if (a !== n) cambios.push({ campo, anterior: a, nuevo: n });
    };

    if (dto.titulo !== undefined) {
      registrar('titulo', orden.titulo, dto.titulo);
      data.titulo = dto.titulo;
    }
    if (dto.descripcionProblema !== undefined) {
      registrar(
        'descripcionProblema',
        orden.descripcionProblema,
        dto.descripcionProblema,
      );
      data.descripcionProblema = dto.descripcionProblema;
    }
    if (dto.prioridad !== undefined) {
      registrar('prioridad', orden.prioridad, dto.prioridad);
      data.prioridad = dto.prioridad;
    }
    if (dto.sedeId !== undefined) {
      registrar('sedeId', orden.sedeId, dto.sedeId);
      data.sedeId = dto.sedeId;
    }
    if (dto.equipoId !== undefined) {
      registrar('equipoId', orden.equipoId, dto.equipoId);
      data.equipoId = dto.equipoId;
    }
    if (dto.tipoMantenimientoId !== undefined) {
      registrar(
        'tipoMantenimientoId',
        orden.tipoMantenimientoId,
        dto.tipoMantenimientoId,
      );
      data.tipoMantenimientoId = dto.tipoMantenimientoId;
    }
    if (dto.fechaProgramada !== undefined) {
      const nueva = new Date(dto.fechaProgramada);
      registrar('fechaProgramada', orden.fechaProgramada, nueva);
      data.fechaProgramada = nueva;
    }
    if (dto.fechaLimite !== undefined) {
      const nueva = new Date(dto.fechaLimite);
      registrar('fechaLimite', orden.fechaLimite, nueva);
      data.fechaLimite = nueva;
    }

    if (cambios.length === 0) {
      return this.obtener(id, usuario);
    }

    const actualizada = await this.prisma.$transaction(async (tx) => {
      await tx.ordenTrabajo.update({ where: { id }, data });

      // Un asiento por campo: el historial debe permitir reconstruir el "antes".
      await tx.ordenHistorial.createMany({
        data: cambios.map((c) => ({
          ordenId: id,
          usuarioId: usuario.id,
          tipo: TipoHistorial.EDICION,
          campo: c.campo,
          valorAnterior: c.anterior,
          valorNuevo: c.nuevo,
        })),
      });

      return this.releer(tx, id);
    });

    this.eventos.publicar(id);
    return actualizada;
  }

  /**
   * Relee la orden con todas sus relaciones.
   *
   * Hace falta releer, y no reutilizar el resultado del create/update: Prisma
   * resuelve el `include` en el momento de esa escritura, asi que el asiento de
   * historial que se inserta despues no saldria en la respuesta.
   */
  private releer(tx: Prisma.TransactionClient, id: string) {
    return tx.ordenTrabajo.findUniqueOrThrow({
      where: { id },
      include: INCLUDE_DETALLE,
    });
  }

  /** Soft delete (regla 5). No es una cancelacion: eso es una transicion. */
  async eliminar(id: string, usuario: UsuarioActual): Promise<void> {
    if (usuario.rol !== Rol.ADMIN) {
      throw new ForbiddenException(
        'Solo un administrador puede eliminar una orden.',
      );
    }

    const orden = await this.prisma.ordenTrabajo.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!orden) {
      throw new NotFoundException(`No existe la orden ${id}.`);
    }

    await this.prisma.ordenTrabajo.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * TCI-42 — comentario sin cambio de estado.
   *
   * Va al mismo historial que las transiciones (TCI-29), que es solo-append: un
   * comentario no se edita ni se borra. Asi el hilo de la orden queda en orden
   * cronologico junto con lo que le fue pasando.
   */
  async comentar(id: string, comentario: string, usuario: UsuarioActual) {
    const orden = await this.prisma.ordenTrabajo.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, tecnicoId: true },
    });
    if (!orden) {
      throw new NotFoundException(`No existe la orden ${id}.`);
    }
    // Misma regla que para ver el detalle: el admin, o el tecnico asignado.
    if (usuario.rol !== Rol.ADMIN && orden.tecnicoId !== usuario.id) {
      throw new ForbiddenException('Esta orden no esta asignada a usted.');
    }

    await this.prisma.ordenHistorial.create({
      data: {
        ordenId: id,
        usuarioId: usuario.id,
        tipo: TipoHistorial.COMENTARIO,
        comentario: comentario.trim(),
      },
    });

    const actualizada = await this.obtener(id, usuario);
    this.eventos.publicar(id);

    // TCI-53. Concierne a la otra parte del hilo: al tecnico si comento el
    // admin, y a los administradores si comento el tecnico. `emitir` descarta
    // al autor, asi que no hace falta filtrarlo aqui.
    await this.notificaciones.emitir({
      evento: EventoNotificable.ORDEN_COMENTADA,
      destinatarios: await this.interesadosEn(actualizada.id, orden.tecnicoId),
      autorId: usuario.id,
      enlace: `/panel/ordenes/${id}`,
      datos: {
        numero: actualizada.numero,
        titulo: actualizada.titulo,
        autor: actualizada.historial.at(-1)?.usuario?.name ?? 'Alguien',
        comentario: comentario.trim(),
      },
    });

    return actualizada;
  }

  /**
   * A quien concierne lo que pase en una orden: su tecnico asignado, si lo
   * tiene, y los administradores activos.
   *
   * Se resuelve aqui y no en el servicio de notificaciones porque es una regla
   * de ordenes —quien esta metido en esta orden— y no de notificaciones.
   */
  private async interesadosEn(
    _ordenId: string,
    tecnicoId: string | null,
  ): Promise<string[]> {
    const admins = await this.prisma.user.findMany({
      where: { rol: Rol.ADMIN, activo: true },
      select: { id: true },
    });
    const ids = admins.map((a) => a.id);
    if (tecnicoId) ids.push(tecnicoId);
    return ids;
  }

  // -------------------------------------------------------------------------
  // TCI-78 — transiciones de estado (incluye TCI-27: completar y cancelar)
  // -------------------------------------------------------------------------

  async transicionar(
    id: string,
    accion: AccionOrden,
    usuario: UsuarioActual,
    extra: {
      motivo?: string;
      comentario?: string;
      tecnicoId?: string;
      cierre?: CompletarOrdenDto;
    } = {},
  ) {
    const orden = await this.prisma.ordenTrabajo.findFirst({
      where: { id, deletedAt: null },
    });
    if (!orden) {
      throw new NotFoundException(`No existe la orden ${id}.`);
    }

    const { nuevoEstado, tipoHistorial } = this.estados.validar({
      accion,
      estadoActual: orden.estado,
      rol: usuario.rol,
      usuarioId: usuario.id,
      tecnicoId: orden.tecnicoId,
      motivo: extra.motivo,
    });

    const ahora = new Date();
    const data: Prisma.OrdenTrabajoUncheckedUpdateInput = {
      estado: nuevoEstado,
    };
    let campo: string | null = null;
    let valorAnterior: string | null = null;
    let valorNuevo: string | null = null;

    switch (accion) {
      case 'asignar':
      case 'reasignar': {
        const tecnico = await this.validarTecnico(extra.tecnicoId);
        campo = 'tecnicoId';
        valorAnterior = orden.tecnicoId;
        valorNuevo = tecnico.id;
        data.tecnicoId = tecnico.id;
        data.fechaAsignacion = ahora;
        break;
      }
      case 'desasignar':
        campo = 'tecnicoId';
        valorAnterior = orden.tecnicoId;
        valorNuevo = null;
        data.tecnicoId = null;
        data.fechaAsignacion = null;
        break;
      case 'iniciar':
        // Solo el primer arranque fija fechaInicio: si no, reanudar tras una
        // pausa falsearia el tiempo de respuesta que mide TCI-60.
        if (!orden.fechaInicio) data.fechaInicio = ahora;
        break;
      case 'completar': {
        const cierre = extra.cierre;
        if (!cierre?.trabajoRealizado?.trim()) {
          throw new UnprocessableEntityException(
            'Para completar hay que describir el trabajo realizado.',
          );
        }
        if (EVIDENCIA_OBLIGATORIA) {
          const evidencias = await this.prisma.ordenAdjunto.count({
            where: {
              ordenId: id,
              tipo: {
                in: [
                  TipoAdjunto.EVIDENCIA_ANTES,
                  TipoAdjunto.EVIDENCIA_DESPUES,
                ],
              },
            },
          });
          if (evidencias === 0) {
            throw new UnprocessableEntityException(
              'Para completar hay que adjuntar al menos una evidencia.',
            );
          }
        }
        data.trabajoRealizado = cierre.trabajoRealizado;
        data.fechaFin = ahora;
        if (cierre.horasTrabajadas !== undefined) {
          data.horasTrabajadas = cierre.horasTrabajadas;
        }
        if (cierre.costoManoObra !== undefined) {
          data.costoManoObra = cierre.costoManoObra;
          data.costoTotal =
            cierre.costoManoObra + Number(orden.costoRepuestos ?? 0);
        }
        break;
      }
      case 'reabrir':
        // La orden vuelve a estar viva: el cierre anterior deja de valer.
        data.fechaFin = null;
        break;
      default:
        break;
    }

    const actualizada = await this.prisma.$transaction(async (tx) => {
      await tx.ordenTrabajo.update({ where: { id }, data });

      await tx.ordenHistorial.create({
        data: {
          ordenId: id,
          usuarioId: usuario.id,
          tipo: tipoHistorial,
          estadoAnterior: orden.estado,
          estadoNuevo: nuevoEstado,
          campo,
          valorAnterior,
          valorNuevo,
          comentario: extra.motivo ?? extra.comentario ?? null,
        },
      });

      return this.releer(tx, id);
    });

    this.eventos.publicar(id);
    await this.notificarTransicion(accion, actualizada, usuario, extra);
    return actualizada;
  }

  /**
   * TCI-53 — regla 9 de docs/flujo-ordenes.md: `asignar`/`reasignar` avisan al
   * tecnico, `completar` al admin, `cancelar` al tecnico asignado y `reabrir`
   * al tecnico.
   *
   * Las demas transiciones —iniciar, pausar, reanudar, desasignar— no avisan a
   * nadie: las hace el propio tecnico sobre su trabajo, y notificarselas al
   * admin en tiempo real convertiria la bandeja en un registro de actividad que
   * nadie leeria.
   */
  private async notificarTransicion(
    accion: AccionOrden,
    orden: {
      id: string;
      numero: string;
      titulo: string;
      tecnicoId: string | null;
      cliente: { nombre: string };
      equipo: { codigo: string; nombre: string } | null;
    },
    usuario: UsuarioActual,
    extra: { motivo?: string },
  ): Promise<void> {
    const datos = {
      numero: orden.numero,
      titulo: orden.titulo,
      cliente: orden.cliente.nombre,
      // Con valor siempre, tambien cuando no hay: una orden sin equipo es
      // legitima, y dejar `{{equipo}}` a la vista ahi se leeria como un fallo.
      // El marcador solo debe verse cuando el emisor se olvido de pasarlo.
      equipo: orden.equipo
        ? `${orden.equipo.codigo} — ${orden.equipo.nombre}`
        : 'sin equipo asociado',
      motivo: extra.motivo ?? 'sin motivo indicado',
    };
    const enlace = `/panel/ordenes/${orden.id}`;

    const alTecnico = orden.tecnicoId ? [orden.tecnicoId] : [];

    switch (accion) {
      case 'asignar':
      case 'reasignar':
        await this.notificaciones.emitir({
          evento: EventoNotificable.ORDEN_ASIGNADA,
          destinatarios: alTecnico,
          autorId: usuario.id,
          enlace,
          datos,
        });
        break;

      case 'completar': {
        const admins = await this.prisma.user.findMany({
          where: { rol: Rol.ADMIN, activo: true },
          select: { id: true, name: true },
        });
        const quien = await this.prisma.user.findUnique({
          where: { id: usuario.id },
          select: { name: true },
        });
        await this.notificaciones.emitir({
          evento: EventoNotificable.ORDEN_COMPLETADA,
          destinatarios: admins.map((a) => a.id),
          autorId: usuario.id,
          enlace,
          datos: { ...datos, tecnico: quien?.name ?? 'El tecnico' },
        });
        break;
      }

      case 'cancelar':
        await this.notificaciones.emitir({
          evento: EventoNotificable.ORDEN_CANCELADA,
          destinatarios: alTecnico,
          autorId: usuario.id,
          enlace,
          datos,
        });
        break;

      case 'reabrir':
        await this.notificaciones.emitir({
          evento: EventoNotificable.ORDEN_REABIERTA,
          destinatarios: alTecnico,
          autorId: usuario.id,
          enlace,
          datos,
        });
        break;

      default:
        break;
    }
  }

  private async validarTecnico(tecnicoId: string | undefined) {
    if (!tecnicoId) {
      throw new UnprocessableEntityException('Falta el tecnico a asignar.');
    }
    const tecnico = await this.prisma.user.findUnique({
      where: { id: tecnicoId },
      select: { id: true, rol: true, activo: true },
    });
    if (!tecnico) {
      throw new UnprocessableEntityException('El tecnico indicado no existe.');
    }
    if (!tecnico.activo) {
      throw new UnprocessableEntityException(
        'El tecnico indicado esta desactivado.',
      );
    }
    return tecnico;
  }
}

import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ActualizarEquipoDto,
  CrearEquipoDto,
  FiltrarEquiposDto,
} from './dto/equipo.dto';

const INCLUDE = {
  cliente: { select: { id: true, nombre: true } },
  sede: { select: { id: true, nombre: true, ciudad: true } },
  // TCI-49: el tipo del catalogo. El campo `tipo` de texto sigue en la tabla
  // con lo que se escribio antes de la migracion, pero ya no manda.
  tipoEquipo: { select: { id: true, nombre: true } },
  // Cuantas ordenes tiene: la interfaz avisa con esto de que no se puede borrar.
  _count: { select: { ordenes: true } },
} satisfies Prisma.EquipoInclude;

/**
 * TCI-37 — equipos y activos por cliente.
 *
 * Igual que en clientes, `activo = false` y `deletedAt` no son lo mismo: lo
 * primero saca al equipo de los formularios, lo segundo solo se permite si
 * nunca tuvo ordenes (regla 2 de docs/modelo-datos-orden.md).
 */
@Injectable()
export class EquiposService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(filtros: FiltrarEquiposDto) {
    const where: Prisma.EquipoWhereInput = { deletedAt: null };
    if (filtros.clienteId) where.clienteId = filtros.clienteId;
    if (filtros.sedeId) where.sedeId = filtros.sedeId;
    if (filtros.activo !== undefined) where.activo = filtros.activo;
    if (filtros.q?.trim()) {
      const q = filtros.q.trim();
      where.OR = [
        { codigo: { contains: q, mode: 'insensitive' } },
        { nombre: { contains: q, mode: 'insensitive' } },
        { marca: { contains: q, mode: 'insensitive' } },
        { modelo: { contains: q, mode: 'insensitive' } },
        { numeroSerie: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.equipo.count({ where }),
      this.prisma.equipo.findMany({
        where,
        include: INCLUDE,
        orderBy: { codigo: 'asc' },
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

  async obtener(id: string) {
    const equipo = await this.prisma.equipo.findFirst({
      where: { id, deletedAt: null },
      include: INCLUDE,
    });
    if (!equipo) {
      throw new NotFoundException(`No existe el equipo ${id}.`);
    }
    return equipo;
  }

  async crear(dto: CrearEquipoDto) {
    await this.exigirCodigoLibre(dto.codigo);
    await this.exigirClienteYSede(dto.clienteId, dto.sedeId);

    return this.prisma.equipo.create({
      data: {
        codigo: dto.codigo.trim().toUpperCase(),
        nombre: dto.nombre.trim(),
        clienteId: dto.clienteId,
        sedeId: dto.sedeId || null,
        tipo: dto.tipo?.trim() || null,
        tipoEquipoId: dto.tipoEquipoId || null,
        marca: dto.marca?.trim() || null,
        modelo: dto.modelo?.trim() || null,
        numeroSerie: dto.numeroSerie?.trim() || null,
        ubicacionFisica: dto.ubicacionFisica?.trim() || null,
      },
      include: INCLUDE,
    });
  }

  async actualizar(id: string, dto: ActualizarEquipoDto) {
    const equipo = await this.obtener(id);
    if (dto.codigo) await this.exigirCodigoLibre(dto.codigo, id);
    // El cliente no cambia; la sede tiene que seguir siendo suya.
    if (dto.sedeId) await this.exigirClienteYSede(equipo.clienteId, dto.sedeId);

    return this.prisma.equipo.update({
      where: { id },
      data: {
        codigo: dto.codigo?.trim().toUpperCase(),
        nombre: dto.nombre?.trim(),
        sedeId: dto.sedeId === undefined ? undefined : dto.sedeId || null,
        tipo: dto.tipo === undefined ? undefined : dto.tipo.trim() || null,
        tipoEquipoId:
          dto.tipoEquipoId === undefined ? undefined : dto.tipoEquipoId || null,
        marca: dto.marca === undefined ? undefined : dto.marca.trim() || null,
        modelo:
          dto.modelo === undefined ? undefined : dto.modelo.trim() || null,
        numeroSerie:
          dto.numeroSerie === undefined
            ? undefined
            : dto.numeroSerie.trim() || null,
        ubicacionFisica:
          dto.ubicacionFisica === undefined
            ? undefined
            : dto.ubicacionFisica.trim() || null,
        activo: dto.activo,
      },
      include: INCLUDE,
    });
  }

  async eliminar(id: string): Promise<void> {
    const equipo = await this.obtener(id);
    if (equipo._count.ordenes > 0) {
      throw new UnprocessableEntityException(
        `El equipo tiene ${equipo._count.ordenes} orden(es) en su historial y no se ` +
          'puede borrar. Desactivelo en su lugar: dejara de aparecer al crear ordenes ' +
          'y su historial se conserva.',
      );
    }

    await this.prisma.equipo.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** `codigo` es unico en todo el sistema, no por cliente. */
  private async exigirCodigoLibre(codigo: string, exceptoId?: string) {
    const normalizado = codigo.trim().toUpperCase();
    const otro = await this.prisma.equipo.findFirst({
      where: {
        codigo: normalizado,
        id: exceptoId ? { not: exceptoId } : undefined,
      },
      select: { id: true, nombre: true, deletedAt: true },
    });
    if (otro) {
      throw new UnprocessableEntityException(
        otro.deletedAt
          ? `El codigo ${normalizado} pertenece a un equipo borrado (${otro.nombre}).`
          : `El codigo ${normalizado} ya esta en uso por ${otro.nombre}.`,
      );
    }
  }

  private async exigirClienteYSede(clienteId: string, sedeId?: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, deletedAt: null },
      select: { id: true, activo: true },
    });
    if (!cliente) {
      throw new UnprocessableEntityException('El cliente no existe.');
    }
    if (!cliente.activo) {
      throw new UnprocessableEntityException(
        'El cliente esta desactivado: reactivelo antes de registrarle equipos.',
      );
    }

    if (!sedeId) return;
    const sede = await this.prisma.sede.findFirst({
      where: { id: sedeId, deletedAt: null },
      select: { clienteId: true },
    });
    if (!sede) {
      throw new UnprocessableEntityException('La sede no existe.');
    }
    if (sede.clienteId !== clienteId) {
      throw new UnprocessableEntityException(
        'La sede no pertenece al cliente del equipo.',
      );
    }
  }
}

import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ActualizarClienteDto,
  ActualizarSedeDto,
  CrearClienteDto,
  CrearSedeDto,
  FiltrarClientesDto,
} from './dto/cliente.dto';

const SEDES_VISIBLES = {
  where: { deletedAt: null },
  select: {
    id: true,
    nombre: true,
    direccion: true,
    ciudad: true,
    referenciaGeo: true,
    activo: true,
  },
  orderBy: { nombre: 'asc' },
} satisfies Prisma.Cliente$sedesArgs;

/**
 * TCI-36 — clientes y sus sedes.
 *
 * Dos formas distintas de "quitar", que no son lo mismo (regla 2 de
 * docs/modelo-datos-orden.md):
 *
 *  - `activo = false` es la baja de negocio: el cliente deja de aparecer para
 *    crear ordenes nuevas, pero sigue existiendo y sus ordenes se consultan.
 *  - `deletedAt` es el borrado, y solo se permite si el cliente nunca tuvo
 *    ordenes. Si las tuvo, borrarlo dejaria huerfano su historial.
 */
@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(filtros: FiltrarClientesDto) {
    const where: Prisma.ClienteWhereInput = { deletedAt: null };
    if (filtros.activo !== undefined) where.activo = filtros.activo;
    if (filtros.q?.trim()) {
      const q = filtros.q.trim();
      where.OR = [
        { nombre: { contains: q, mode: 'insensitive' } },
        { rtn: { contains: q, mode: 'insensitive' } },
        { contacto: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.cliente.findMany({
      where,
      include: {
        sedes: SEDES_VISIBLES,
        // Sirve para avisar en la interfaz de que un cliente no se puede borrar.
        _count: { select: { ordenes: true, equipos: true } },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async obtener(id: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id, deletedAt: null },
      include: {
        sedes: SEDES_VISIBLES,
        _count: { select: { ordenes: true, equipos: true } },
      },
    });
    if (!cliente) {
      throw new NotFoundException(`No existe el cliente ${id}.`);
    }
    return cliente;
  }

  async crear(dto: CrearClienteDto) {
    await this.exigirRtnLibre(dto.rtn);
    return this.prisma.cliente.create({
      data: {
        nombre: dto.nombre.trim(),
        rtn: dto.rtn || null,
        contacto: dto.contacto?.trim() || null,
        telefono: dto.telefono?.trim() || null,
        email: dto.email?.trim().toLowerCase() || null,
      },
      include: {
        sedes: SEDES_VISIBLES,
        _count: { select: { ordenes: true, equipos: true } },
      },
    });
  }

  async actualizar(id: string, dto: ActualizarClienteDto) {
    await this.obtener(id);
    await this.exigirRtnLibre(dto.rtn, id);

    return this.prisma.cliente.update({
      where: { id },
      data: {
        nombre: dto.nombre?.trim(),
        rtn: dto.rtn === undefined ? undefined : dto.rtn || null,
        contacto:
          dto.contacto === undefined ? undefined : dto.contacto.trim() || null,
        telefono:
          dto.telefono === undefined ? undefined : dto.telefono.trim() || null,
        email:
          dto.email === undefined
            ? undefined
            : dto.email.trim().toLowerCase() || null,
        activo: dto.activo,
      },
      include: {
        sedes: SEDES_VISIBLES,
        _count: { select: { ordenes: true, equipos: true } },
      },
    });
  }

  async eliminar(id: string): Promise<void> {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { ordenes: true } } },
    });
    if (!cliente) {
      throw new NotFoundException(`No existe el cliente ${id}.`);
    }
    if (cliente._count.ordenes > 0) {
      throw new UnprocessableEntityException(
        `El cliente tiene ${cliente._count.ordenes} orden(es) registradas y no se puede ` +
          'borrar. Desactivelo en su lugar: dejara de aparecer al crear ordenes y su ' +
          'historial se conserva.',
      );
    }

    // Las sedes se marcan a la vez: sin cliente no tienen sentido, y si no
    // quedarian visibles en la busqueda de sedes.
    const ahora = new Date();
    await this.prisma.$transaction([
      this.prisma.sede.updateMany({
        where: { clienteId: id, deletedAt: null },
        data: { deletedAt: ahora },
      }),
      this.prisma.cliente.update({
        where: { id },
        data: { deletedAt: ahora },
      }),
    ]);
  }

  // --- Sedes ---------------------------------------------------------------

  async crearSede(clienteId: string, dto: CrearSedeDto) {
    await this.obtener(clienteId);
    return this.prisma.sede.create({
      data: {
        clienteId,
        nombre: dto.nombre.trim(),
        direccion: dto.direccion?.trim() || null,
        ciudad: dto.ciudad?.trim() || null,
        referenciaGeo: dto.referenciaGeo?.trim() || null,
      },
      select: SEDES_VISIBLES.select,
    });
  }

  async actualizarSede(id: string, dto: ActualizarSedeDto) {
    await this.buscarSede(id);
    return this.prisma.sede.update({
      where: { id },
      data: {
        nombre: dto.nombre?.trim(),
        direccion:
          dto.direccion === undefined
            ? undefined
            : dto.direccion.trim() || null,
        ciudad:
          dto.ciudad === undefined ? undefined : dto.ciudad.trim() || null,
        referenciaGeo:
          dto.referenciaGeo === undefined
            ? undefined
            : dto.referenciaGeo.trim() || null,
        activo: dto.activo,
      },
      select: SEDES_VISIBLES.select,
    });
  }

  async eliminarSede(id: string): Promise<void> {
    await this.buscarSede(id);

    const [ordenes, equipos] = await this.prisma.$transaction([
      this.prisma.ordenTrabajo.count({
        where: { sedeId: id, deletedAt: null },
      }),
      this.prisma.equipo.count({ where: { sedeId: id, deletedAt: null } }),
    ]);
    if (ordenes > 0 || equipos > 0) {
      throw new UnprocessableEntityException(
        `La sede tiene ${ordenes} orden(es) y ${equipos} equipo(s) asociados. ` +
          'Desactivela en lugar de borrarla.',
      );
    }

    await this.prisma.sede.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async buscarSede(id: string) {
    const sede = await this.prisma.sede.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, clienteId: true },
    });
    if (!sede) {
      throw new NotFoundException(`No existe la sede ${id}.`);
    }
    return sede;
  }

  /**
   * El indice unico de `rtn` ya lo impide, pero dejarlo llegar a la base
   * devolveria un P2002 opaco en vez de decir cual es el problema.
   */
  private async exigirRtnLibre(rtn: string | undefined, exceptoId?: string) {
    if (!rtn) return;
    const otro = await this.prisma.cliente.findFirst({
      where: { rtn, id: exceptoId ? { not: exceptoId } : undefined },
      select: { id: true, nombre: true, deletedAt: true },
    });
    if (otro) {
      throw new UnprocessableEntityException(
        otro.deletedAt
          ? `El RTN ${rtn} pertenece a un cliente borrado (${otro.nombre}).`
          : `El RTN ${rtn} ya esta registrado para ${otro.nombre}.`,
      );
    }
  }
}

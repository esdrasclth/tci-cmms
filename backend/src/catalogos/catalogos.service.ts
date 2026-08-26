import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ActualizarTipoMantenimientoDto,
  CrearTipoMantenimientoDto,
  FiltrarTiposDto,
} from './dto/tipo-mantenimiento.dto';

/**
 * Catalogo de tipos de mantenimiento — TCI-30.
 *
 * La lectura no exige rol: cualquiera con sesion que pueda crear una orden
 * necesita elegir el tipo. La escritura es solo de administradores, y eso lo
 * impone `@Roles(ADMIN)` en el controller.
 */

const CAMPOS = {
  id: true,
  codigo: true,
  nombre: true,
  color: true,
  requiereEquipo: true,
  activo: true,
  createdAt: true,
} satisfies Prisma.TipoMantenimientoSelect;

@Injectable()
export class CatalogosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Los tipos que puede elegir quien crea una orden: solo los activos.
   *
   * Es una consulta distinta de `listar()` a proposito. Si el formulario de
   * alta ofreciera un tipo desactivado, el backend rechazaria la orden con un
   * 422 (ver OrdenesService.crear) y el usuario no entenderia por que.
   */
  tiposMantenimiento() {
    return this.prisma.tipoMantenimiento.findMany({
      where: { activo: true },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        color: true,
        // Lo usa el formulario para exigir equipo (regla 3 de TCI-22).
        requiereEquipo: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  /** Listado de administracion: trae activos e inactivos salvo que se filtre. */
  async listar(filtros: FiltrarTiposDto) {
    const where: Prisma.TipoMantenimientoWhereInput = {};

    if (filtros.activo !== undefined) where.activo = filtros.activo;
    if (filtros.q?.trim()) {
      const q = filtros.q.trim();
      where.OR = [
        { codigo: { contains: q, mode: 'insensitive' } },
        { nombre: { contains: q, mode: 'insensitive' } },
      ];
    }

    const tipos = await this.prisma.tipoMantenimiento.findMany({
      where,
      select: { ...CAMPOS, _count: { select: { ordenes: true } } },
      orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
    });

    // El conteo de ordenes le dice al admin si puede borrar el tipo o solo
    // desactivarlo, sin tener que intentarlo para descubrirlo.
    return tipos.map(({ _count, ...tipo }) => ({
      ...tipo,
      ordenes: _count.ordenes,
    }));
  }

  async crear(dto: CrearTipoMantenimientoDto) {
    await this.exigirCodigoLibre(dto.codigo);

    return this.prisma.tipoMantenimiento.create({
      data: {
        codigo: dto.codigo,
        nombre: dto.nombre.trim(),
        color: dto.color,
        requiereEquipo: dto.requiereEquipo ?? false,
      },
      select: CAMPOS,
    });
  }

  async actualizar(id: string, dto: ActualizarTipoMantenimientoDto) {
    const tipo = await this.buscar(id);

    if (dto.codigo && dto.codigo !== tipo.codigo) {
      await this.exigirCodigoLibre(dto.codigo);
    }

    return this.prisma.tipoMantenimiento.update({
      where: { id },
      data: {
        codigo: dto.codigo,
        nombre: dto.nombre?.trim(),
        color: dto.color,
        requiereEquipo: dto.requiereEquipo,
        activo: dto.activo,
      },
      select: CAMPOS,
    });
  }

  /**
   * Borrado real, no logico: `TipoMantenimiento` no tiene `deletedAt`.
   *
   * Se rechaza si alguna orden lo usa, porque la FK es `Restrict` y porque el
   * tipo forma parte del historial de esa orden. Para retirar uno que ya se uso
   * esta `activo: false`, que lo saca de los formularios sin tocar el pasado.
   */
  async eliminar(id: string): Promise<void> {
    const tipo = await this.prisma.tipoMantenimiento.findUnique({
      where: { id },
      select: { id: true, nombre: true, _count: { select: { ordenes: true } } },
    });
    if (!tipo) {
      throw new NotFoundException(`No existe el tipo de mantenimiento ${id}.`);
    }

    if (tipo._count.ordenes > 0) {
      throw new UnprocessableEntityException(
        `'${tipo.nombre}' se usa en ${tipo._count.ordenes} orden(es) y no se puede borrar. ` +
          'Desactivelo en su lugar: dejara de aparecer al crear ordenes y su historial se conserva.',
      );
    }

    await this.prisma.tipoMantenimiento.delete({ where: { id } });
  }

  private async buscar(id: string) {
    const tipo = await this.prisma.tipoMantenimiento.findUnique({
      where: { id },
      select: CAMPOS,
    });
    if (!tipo) {
      throw new NotFoundException(`No existe el tipo de mantenimiento ${id}.`);
    }
    return tipo;
  }

  /**
   * El indice unico de `codigo` ya lo impide, pero se comprueba antes para dar
   * un mensaje util en vez del P2002 opaco de Prisma. Mismo criterio que en
   * clientes con el RTN (TCI-36).
   */
  private async exigirCodigoLibre(codigo: string): Promise<void> {
    const existente = await this.prisma.tipoMantenimiento.findUnique({
      where: { codigo },
      select: { nombre: true },
    });
    if (existente) {
      throw new UnprocessableEntityException(
        `El codigo ${codigo} ya lo usa '${existente.nombre}'.`,
      );
    }
  }
}

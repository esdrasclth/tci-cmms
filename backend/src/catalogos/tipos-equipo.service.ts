import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ActualizarTipoEquipoDto,
  CrearTipoEquipoDto,
  FiltrarTiposEquipoDto,
} from './dto/tipo-equipo.dto';

/**
 * TCI-49 — catalogo de tipos de equipo.
 *
 * Existe porque los planes de mantenimiento preventivo se definen por tipo de
 * equipo, y hasta ahora el tipo era texto libre en `Equipo.tipo`: un plan
 * colgado de ese campo se rompia en silencio con un plural o una tilde, y los
 * equipos sin tipo no recibian plan sin que nadie se enterara.
 *
 * El campo de texto sigue en la tabla con lo que se escribio antes de la
 * migracion, pero ya no se usa para nada: la relacion buena es `tipoEquipoId`.
 */

const CAMPOS = {
  id: true,
  nombre: true,
  activo: true,
  createdAt: true,
} satisfies Prisma.TipoEquipoSelect;

@Injectable()
export class TiposEquipoService {
  constructor(private readonly prisma: PrismaService) {}

  /** Los que puede elegir quien da de alta un equipo: solo activos. */
  activos() {
    return this.prisma.tipoEquipo.findMany({
      where: { activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async listar(filtros: FiltrarTiposEquipoDto) {
    const where: Prisma.TipoEquipoWhereInput = {};
    if (filtros.activo !== undefined) where.activo = filtros.activo;
    if (filtros.q?.trim()) {
      where.nombre = { contains: filtros.q.trim(), mode: 'insensitive' };
    }

    const tipos = await this.prisma.tipoEquipo.findMany({
      where,
      select: {
        ...CAMPOS,
        _count: { select: { equipos: true, planes: true } },
      },
      orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
    });

    return tipos.map(({ _count, ...tipo }) => ({
      ...tipo,
      equipos: _count.equipos,
      planes: _count.planes,
    }));
  }

  async crear(dto: CrearTipoEquipoDto) {
    await this.exigirNombreLibre(dto.nombre);
    return this.prisma.tipoEquipo.create({
      data: { nombre: dto.nombre },
      select: CAMPOS,
    });
  }

  async actualizar(id: string, dto: ActualizarTipoEquipoDto) {
    const tipo = await this.buscar(id);
    if (dto.nombre && dto.nombre !== tipo.nombre) {
      await this.exigirNombreLibre(dto.nombre);
    }

    return this.prisma.tipoEquipo.update({
      where: { id },
      data: { nombre: dto.nombre, activo: dto.activo },
      select: CAMPOS,
    });
  }

  /**
   * Borrado real. Se rechaza si algun equipo o algun plan lo usa: las dos FK
   * son `Restrict` y, en el caso del plan, borrarlo lo dejaria sin saber a que
   * equipos aplica. Para retirarlo esta `activo: false`.
   */
  async eliminar(id: string): Promise<void> {
    const tipo = await this.prisma.tipoEquipo.findUnique({
      where: { id },
      select: {
        nombre: true,
        _count: { select: { equipos: true, planes: true } },
      },
    });
    if (!tipo)
      throw new NotFoundException(`No existe el tipo de equipo ${id}.`);

    if (tipo._count.equipos > 0) {
      throw new UnprocessableEntityException(
        `'${tipo.nombre}' lo usan ${tipo._count.equipos} equipo(s) y no se puede borrar. ` +
          'Desactivelo en su lugar: dejara de ofrecerse al dar de alta equipos.',
      );
    }
    if (tipo._count.planes > 0) {
      throw new UnprocessableEntityException(
        `'${tipo.nombre}' lo usan ${tipo._count.planes} plan(es) de mantenimiento. ` +
          'Borre o reasigne esos planes primero.',
      );
    }

    await this.prisma.tipoEquipo.delete({ where: { id } });
  }

  private async buscar(id: string) {
    const tipo = await this.prisma.tipoEquipo.findUnique({
      where: { id },
      select: CAMPOS,
    });
    if (!tipo)
      throw new NotFoundException(`No existe el tipo de equipo ${id}.`);
    return tipo;
  }

  /**
   * El indice unico ya lo impide, pero se comprueba antes para dar un mensaje
   * util. La comparacion ignora mayusculas: "Compresor" y "compresor" son el
   * mismo tipo, y admitir los dos partiria en dos el plan que cuelga de el.
   */
  private async exigirNombreLibre(nombre: string): Promise<void> {
    const existente = await this.prisma.tipoEquipo.findFirst({
      where: { nombre: { equals: nombre, mode: 'insensitive' } },
      select: { nombre: true },
    });
    if (existente) {
      throw new UnprocessableEntityException(
        `Ya existe el tipo de equipo '${existente.nombre}'.`,
      );
    }
  }
}

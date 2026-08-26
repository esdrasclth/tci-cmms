import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { TipoMovimiento } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import {
  ActualizarRepuestoDto,
  CrearRepuestoDto,
  FiltrarMovimientosDto,
  FiltrarRepuestosDto,
  RegistrarMovimientoDto,
} from './dto/repuesto.dto';

/**
 * Catalogo de repuestos y saldo de almacen — TCI-45 y TCI-47.
 *
 * `stockActual` esta duplicado respecto al libro de movimientos, y esa
 * duplicidad solo se sostiene si hay un unico camino que la escribe: `mover()`.
 * Ningun otro metodo de este servicio —ni de ningun otro— toca `stockActual`.
 * Quien necesite mover existencias llama aqui.
 */

const CAMPOS = {
  id: true,
  codigo: true,
  nombre: true,
  descripcion: true,
  unidadMedida: true,
  stockActual: true,
  stockMinimo: true,
  costoUnitario: true,
  moneda: true,
  activo: true,
  createdAt: true,
} satisfies Prisma.RepuestoSelect;

/** Lo que se necesita saber de un repuesto para moverlo. */
export type RepuestoParaMover = {
  id: string;
  nombre: string;
  codigo: string;
  unidadMedida: string;
  stockActual: Prisma.Decimal;
  stockMinimo: Prisma.Decimal;
  costoUnitario: Prisma.Decimal;
  activo: boolean;
};

@Injectable()
export class InventarioService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // TCI-45 — catalogo
  // -------------------------------------------------------------------------

  /**
   * Los repuestos que puede elegir quien imputa consumo: solo activos y con
   * existencia. Es una consulta distinta de `listar()` por la misma razon que
   * en los tipos de mantenimiento (TCI-30): ofrecer algo que el backend va a
   * rechazar despues es peor que no ofrecerlo.
   */
  disponibles() {
    return this.prisma.repuesto.findMany({
      where: { activo: true, stockActual: { gt: 0 } },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        unidadMedida: true,
        stockActual: true,
        costoUnitario: true,
        moneda: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  /** Listado de administracion: activos e inactivos salvo que se filtre. */
  async listar(filtros: FiltrarRepuestosDto) {
    const where: Prisma.RepuestoWhereInput = {};

    if (filtros.activo !== undefined) where.activo = filtros.activo;
    if (filtros.q?.trim()) {
      const q = filtros.q.trim();
      where.OR = [
        { codigo: { contains: q, mode: 'insensitive' } },
        { nombre: { contains: q, mode: 'insensitive' } },
      ];
    }

    const repuestos = await this.prisma.repuesto.findMany({
      where,
      select: { ...CAMPOS, _count: { select: { consumos: true } } },
      orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
    });

    return (
      repuestos
        .map(({ _count, ...repuesto }) => ({
          ...repuesto,
          ordenes: _count.consumos,
          bajoMinimo: this.estaBajoMinimo(repuesto),
        }))
        // El filtro de minimos se aplica aqui y no en SQL porque compara dos
        // columnas de la misma fila, algo que el `where` de Prisma no expresa.
        // El catalogo de TCI son decenas de filas, no miles.
        .filter((repuesto) => !filtros.bajoMinimo || repuesto.bajoMinimo)
    );
  }

  /**
   * TCI-47 — repuestos en o por debajo del minimo.
   *
   * Es la "notificacion interna" del work item: hoy se consulta, no se envia.
   * El aviso por correo o push necesita el modulo 8 y va con TCI-54.
   */
  async alertas() {
    const repuestos = await this.prisma.repuesto.findMany({
      where: { activo: true },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        unidadMedida: true,
        stockActual: true,
        stockMinimo: true,
      },
      orderBy: { nombre: 'asc' },
    });
    return repuestos.filter((repuesto) => this.estaBajoMinimo(repuesto));
  }

  async crear(dto: CrearRepuestoDto) {
    await this.exigirCodigoLibre(dto.codigo);

    return this.prisma.repuesto.create({
      data: {
        codigo: dto.codigo,
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim() || null,
        unidadMedida: dto.unidadMedida.trim(),
        stockActual: dto.stockActual ?? 0,
        stockMinimo: dto.stockMinimo ?? 0,
        costoUnitario: dto.costoUnitario ?? 0,
      },
      select: CAMPOS,
    });
  }

  async actualizar(id: string, dto: ActualizarRepuestoDto) {
    const repuesto = await this.buscar(id);

    if (dto.codigo && dto.codigo !== repuesto.codigo) {
      await this.exigirCodigoLibre(dto.codigo);
    }

    return this.prisma.repuesto.update({
      where: { id },
      data: {
        codigo: dto.codigo,
        nombre: dto.nombre?.trim(),
        descripcion:
          dto.descripcion === undefined
            ? undefined
            : dto.descripcion.trim() || null,
        unidadMedida: dto.unidadMedida?.trim(),
        stockMinimo: dto.stockMinimo,
        costoUnitario: dto.costoUnitario,
        activo: dto.activo,
      },
      select: CAMPOS,
    });
  }

  /**
   * Borrado real, como en los tipos de mantenimiento: la tabla no tiene
   * `deletedAt`. Se rechaza si el repuesto se imputo alguna vez, porque forma
   * parte del costo de esas ordenes. Para retirarlo esta `activo: false`.
   */
  async eliminar(id: string): Promise<void> {
    const repuesto = await this.prisma.repuesto.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        _count: { select: { consumos: true, movimientos: true } },
      },
    });
    if (!repuesto) throw new NotFoundException(`No existe el repuesto ${id}.`);

    if (repuesto._count.consumos > 0) {
      throw new UnprocessableEntityException(
        `'${repuesto.nombre}' se imputo a ${repuesto._count.consumos} orden(es) y no se puede borrar. ` +
          'Desactivelo en su lugar: dejara de ofrecerse y su historial se conserva.',
      );
    }
    if (repuesto._count.movimientos > 0) {
      throw new UnprocessableEntityException(
        `'${repuesto.nombre}' tiene ${repuesto._count.movimientos} movimiento(s) de almacen registrados. ` +
          'Desactivelo en su lugar para conservar el libro.',
      );
    }

    await this.prisma.repuesto.delete({ where: { id } });
  }

  // -------------------------------------------------------------------------
  // Movimientos de almacen
  // -------------------------------------------------------------------------

  /** El libro de un repuesto, del mas reciente al mas antiguo. */
  async movimientos(id: string, filtros: FiltrarMovimientosDto) {
    await this.buscar(id);
    return this.prisma.movimientoInventario.findMany({
      where: { repuestoId: id },
      select: {
        id: true,
        tipo: true,
        cantidad: true,
        stockResultante: true,
        motivo: true,
        createdAt: true,
        usuario: { select: { id: true, name: true } },
        orden: { select: { id: true, numero: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: filtros.limite ?? 50,
    });
  }

  /** Entrada o salida registrada a mano por un administrador. */
  async registrarMovimiento(
    id: string,
    tipo: TipoMovimiento,
    dto: RegistrarMovimientoDto,
    usuarioId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.mover(tx, {
        repuestoId: id,
        tipo,
        cantidad: dto.cantidad,
        usuarioId,
        motivo: dto.motivo.trim(),
      });
      return tx.repuesto.findUniqueOrThrow({ where: { id }, select: CAMPOS });
    });
  }

  /**
   * El unico camino que escribe `stockActual`. Escribe el asiento y el saldo en
   * la misma transaccion, y devuelve el repuesto tal como quedo.
   *
   * Recibe la transaccion en vez de abrirla porque el consumo de una orden
   * (TCI-46) mueve stock e imputa costo, y las dos cosas tienen que caer o
   * confirmarse juntas.
   */
  async mover(
    tx: Prisma.TransactionClient,
    asiento: {
      repuestoId: string;
      tipo: TipoMovimiento;
      cantidad: number;
      usuarioId: string;
      ordenId?: string;
      motivo?: string;
    },
  ): Promise<RepuestoParaMover> {
    const repuesto = await tx.repuesto.findUnique({
      where: { id: asiento.repuestoId },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        unidadMedida: true,
        stockActual: true,
        stockMinimo: true,
        costoUnitario: true,
        activo: true,
      },
    });
    if (!repuesto) {
      throw new NotFoundException(
        `No existe el repuesto ${asiento.repuestoId}.`,
      );
    }

    const delta =
      asiento.tipo === TipoMovimiento.SALIDA
        ? -asiento.cantidad
        : asiento.cantidad;
    const resultante = repuesto.stockActual.plus(delta);

    // El almacen no presta lo que no tiene. Se comprueba aqui, dentro de la
    // transaccion, y no antes: entre la lectura y la escritura puede haberse
    // colado otra salida del mismo repuesto.
    if (resultante.lessThan(0)) {
      throw new UnprocessableEntityException(
        `No hay existencia suficiente de '${repuesto.nombre}': ` +
          `quedan ${repuesto.stockActual.toString()} ${repuesto.unidadMedida} y se piden ${asiento.cantidad}.`,
      );
    }

    await tx.movimientoInventario.create({
      data: {
        repuestoId: repuesto.id,
        usuarioId: asiento.usuarioId,
        ordenId: asiento.ordenId,
        tipo: asiento.tipo,
        cantidad: asiento.cantidad,
        stockResultante: resultante,
        motivo: asiento.motivo,
      },
    });

    const actualizado = await tx.repuesto.update({
      where: { id: repuesto.id },
      data: { stockActual: resultante },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        unidadMedida: true,
        stockActual: true,
        stockMinimo: true,
        costoUnitario: true,
        activo: true,
      },
    });
    return actualizado;
  }

  // -------------------------------------------------------------------------
  // Reglas compartidas
  // -------------------------------------------------------------------------

  /**
   * "En o por debajo" del minimo, no solo por debajo: llegar justo al minimo ya
   * es el momento de reponer. Un minimo de cero nunca avisa, que es la forma de
   * decir "este repuesto no se controla".
   */
  private estaBajoMinimo(repuesto: {
    stockActual: Prisma.Decimal;
    stockMinimo: Prisma.Decimal;
  }): boolean {
    if (repuesto.stockMinimo.lessThanOrEqualTo(0)) return false;
    return repuesto.stockActual.lessThanOrEqualTo(repuesto.stockMinimo);
  }

  private async buscar(id: string) {
    const repuesto = await this.prisma.repuesto.findUnique({
      where: { id },
      select: CAMPOS,
    });
    if (!repuesto) throw new NotFoundException(`No existe el repuesto ${id}.`);
    return repuesto;
  }

  /** Igual que en tipos de mantenimiento: mensaje util en vez del P2002 opaco. */
  private async exigirCodigoLibre(codigo: string): Promise<void> {
    const existente = await this.prisma.repuesto.findUnique({
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

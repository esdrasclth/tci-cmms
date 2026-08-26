import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import type { UsuarioActual } from '../auth/usuario-actual';
import { Prisma } from '../generated/prisma/client';
import { OrdenEstado, Rol, TipoMovimiento } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CorregirConsumoDto, ImputarRepuestoDto } from './dto/consumo.dto';
import { InventarioService } from './inventario.service';

/**
 * TCI-46 — repuestos consumidos en una orden de trabajo.
 *
 * Cada operacion hace dos cosas que tienen que ocurrir juntas: mover existencia
 * en el almacen e imputar costo a la orden. Por eso todo pasa por una
 * transaccion y por `InventarioService.mover()`, que es quien sabe tocar el
 * stock.
 *
 * El costo unitario se congela en la linea al imputarlo. Si manana sube el
 * precio del rodamiento, la orden de la semana pasada sigue costando lo que
 * costo: el precio del catalogo es el de hoy, no el de siempre.
 */

const LINEA = {
  id: true,
  cantidad: true,
  costoUnitario: true,
  createdAt: true,
  repuesto: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
      unidadMedida: true,
      stockActual: true,
      stockMinimo: true,
      moneda: true,
    },
  },
} satisfies Prisma.OrdenRepuestoSelect;

@Injectable()
export class ConsumoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventario: InventarioService,
  ) {}

  async listar(ordenId: string, usuario: UsuarioActual) {
    await this.ordenAccesible(ordenId, usuario);
    return this.prisma.ordenRepuesto.findMany({
      where: { ordenId },
      select: LINEA,
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Imputa un repuesto a la orden. Si ya estaba, acumula sobre la misma linea:
   * el tecnico que baja dos veces al almacen no crea dos filas del mismo
   * rodamiento. El detalle de cada bajada queda en el libro de movimientos.
   */
  async imputar(
    ordenId: string,
    dto: ImputarRepuestoDto,
    usuario: UsuarioActual,
  ) {
    const orden = await this.ordenAccesible(ordenId, usuario);
    this.exigirOrdenAbierta(orden.estado, 'imputar repuestos a');

    return this.prisma.$transaction(async (tx) => {
      // Se comprueba antes de mover: un repuesto retirado del catalogo no
      // vuelve a salir del almacen, aunque quede existencia de el.
      const catalogo = await tx.repuesto.findUnique({
        where: { id: dto.repuestoId },
        select: { nombre: true, activo: true },
      });
      if (!catalogo) {
        throw new NotFoundException(`No existe el repuesto ${dto.repuestoId}.`);
      }
      if (!catalogo.activo) {
        throw new UnprocessableEntityException(
          `'${catalogo.nombre}' esta desactivado y no se puede imputar.`,
        );
      }

      const repuesto = await this.inventario.mover(tx, {
        repuestoId: dto.repuestoId,
        tipo: TipoMovimiento.SALIDA,
        cantidad: dto.cantidad,
        usuarioId: usuario.id,
        ordenId,
        motivo: `Consumo en la orden ${orden.numero}`,
      });

      const existente = await tx.ordenRepuesto.findUnique({
        where: { ordenId_repuestoId: { ordenId, repuestoId: repuesto.id } },
        select: { id: true, cantidad: true },
      });

      const linea = existente
        ? await tx.ordenRepuesto.update({
            where: { id: existente.id },
            data: { cantidad: existente.cantidad.plus(dto.cantidad) },
            select: LINEA,
          })
        : await tx.ordenRepuesto.create({
            data: {
              ordenId,
              repuestoId: repuesto.id,
              cantidad: dto.cantidad,
              // Se congela ahora, no al cerrar: el precio que vale es el del
              // dia en que el repuesto salio del almacen.
              costoUnitario: repuesto.costoUnitario,
            },
            select: LINEA,
          });

      await this.recalcularCosto(tx, ordenId);
      return linea;
    });
  }

  /**
   * Corrige la cantidad de una linea. La diferencia vuelve al almacen o sale de
   * el, segun el signo, con su propio asiento: una correccion no borra lo que
   * ya paso, anade el movimiento que lo compensa.
   */
  async corregir(
    ordenId: string,
    lineaId: string,
    dto: CorregirConsumoDto,
    usuario: UsuarioActual,
  ) {
    const orden = await this.ordenAccesible(ordenId, usuario);
    this.exigirOrdenAbierta(orden.estado, 'corregir los repuestos de');

    return this.prisma.$transaction(async (tx) => {
      const linea = await this.lineaDeLaOrden(tx, ordenId, lineaId);
      const diferencia = new Prisma.Decimal(dto.cantidad).minus(linea.cantidad);

      if (!diferencia.isZero()) {
        await this.inventario.mover(tx, {
          repuestoId: linea.repuestoId,
          tipo: diferencia.isPositive()
            ? TipoMovimiento.SALIDA
            : TipoMovimiento.ENTRADA,
          cantidad: diferencia.abs().toNumber(),
          usuarioId: usuario.id,
          ordenId,
          motivo: `Correccion del consumo en la orden ${orden.numero}`,
        });
      }

      const actualizada = await tx.ordenRepuesto.update({
        where: { id: lineaId },
        data: { cantidad: dto.cantidad },
        select: LINEA,
      });

      await this.recalcularCosto(tx, ordenId);
      return actualizada;
    });
  }

  /** Retira la linea y devuelve al almacen todo lo que se habia imputado. */
  async retirar(
    ordenId: string,
    lineaId: string,
    usuario: UsuarioActual,
  ): Promise<void> {
    const orden = await this.ordenAccesible(ordenId, usuario);
    this.exigirOrdenAbierta(orden.estado, 'retirar repuestos de');

    await this.prisma.$transaction(async (tx) => {
      const linea = await this.lineaDeLaOrden(tx, ordenId, lineaId);

      await this.inventario.mover(tx, {
        repuestoId: linea.repuestoId,
        tipo: TipoMovimiento.ENTRADA,
        cantidad: linea.cantidad.toNumber(),
        usuarioId: usuario.id,
        ordenId,
        motivo: `Devolucion del consumo de la orden ${orden.numero}`,
      });

      await tx.ordenRepuesto.delete({ where: { id: lineaId } });
      await this.recalcularCosto(tx, ordenId);
    });
  }

  // -------------------------------------------------------------------------
  // Reglas compartidas
  // -------------------------------------------------------------------------

  /**
   * `costoRepuestos` se recalcula desde las lineas, nunca se acumula sumando y
   * restando: al tercer redondeo la orden costaria algo que no cuadra con su
   * propio desglose. `costoTotal` se rehace con la mano de obra ya registrada.
   */
  private async recalcularCosto(
    tx: Prisma.TransactionClient,
    ordenId: string,
  ): Promise<void> {
    const lineas = await tx.ordenRepuesto.findMany({
      where: { ordenId },
      select: { cantidad: true, costoUnitario: true },
    });

    const repuestos = lineas.reduce(
      (total, linea) => total.plus(linea.cantidad.times(linea.costoUnitario)),
      new Prisma.Decimal(0),
    );

    const orden = await tx.ordenTrabajo.findUniqueOrThrow({
      where: { id: ordenId },
      select: { costoManoObra: true },
    });

    await tx.ordenTrabajo.update({
      where: { id: ordenId },
      data: {
        costoRepuestos: repuestos,
        costoTotal: repuestos.plus(orden.costoManoObra),
      },
    });
  }

  private async lineaDeLaOrden(
    tx: Prisma.TransactionClient,
    ordenId: string,
    lineaId: string,
  ) {
    const linea = await tx.ordenRepuesto.findFirst({
      // Filtra tambien por `ordenId`: sin eso, quien tiene acceso a una orden
      // podria tocar la linea de otra pasando su id.
      where: { id: lineaId, ordenId },
      select: { id: true, repuestoId: true, cantidad: true },
    });
    if (!linea) {
      throw new NotFoundException(
        `La orden ${ordenId} no tiene la linea de repuesto ${lineaId}.`,
      );
    }
    return linea;
  }

  /** Misma regla que la evidencia (TCI-43): el admin o el tecnico asignado. */
  private async ordenAccesible(ordenId: string, usuario: UsuarioActual) {
    const orden = await this.prisma.ordenTrabajo.findFirst({
      where: { id: ordenId, deletedAt: null },
      select: { id: true, numero: true, estado: true, tecnicoId: true },
    });
    if (!orden) throw new NotFoundException(`No existe la orden ${ordenId}.`);

    if (usuario.rol !== Rol.ADMIN && orden.tecnicoId !== usuario.id) {
      throw new ForbiddenException('Esta orden no esta asignada a usted.');
    }
    return orden;
  }

  /**
   * Una orden cerrada no admite cambios en su consumo, ni de un admin: el
   * costo imputado es parte del acta de cierre. Para corregirlo hay que
   * reabrirla, y eso deja rastro en el historial (TCI-78).
   */
  private exigirOrdenAbierta(estado: OrdenEstado, accion: string): void {
    if (estado === OrdenEstado.COMPLETADA || estado === OrdenEstado.CANCELADA) {
      throw new UnprocessableEntityException(
        `No se puede ${accion} una orden ${estado}. Reabrala primero.`,
      );
    }
  }
}

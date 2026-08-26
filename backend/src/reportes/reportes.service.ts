import { Injectable } from '@nestjs/common';

import { finDelDia, inicioDelDia } from '../comun/fechas';
import { promedioDeDias } from '../equipos/historial-equipo.service';
import { Prisma } from '../generated/prisma/client';
import { OrdenEstado, Rol } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { PeriodoDto } from './dto/reportes.dto';

/**
 * Reportes e historial — TCI-58 y TCI-60.
 *
 * Todo lo de aqui es de solo lectura y solo para administradores: son las
 * preguntas que hace la gerencia, no el tecnico en campo. Por eso no hay
 * aislamiento por rol que aplicar dentro de las consultas; lo corta el
 * `@Roles(ADMIN)` del controller.
 *
 * Las agregaciones se hacen en la base y no en memoria salvo dos: el promedio
 * de resolucion y el conteo por tecnico, que necesitan cruzar filas y en este
 * volumen —cientos de ordenes, no millones— no justifican SQL a mano.
 */

const CAMPOS_EXPORTACION = {
  numero: true,
  titulo: true,
  estado: true,
  prioridad: true,
  createdAt: true,
  fechaProgramada: true,
  fechaInicio: true,
  fechaFin: true,
  horasTrabajadas: true,
  costoManoObra: true,
  costoRepuestos: true,
  costoTotal: true,
  moneda: true,
  cliente: { select: { nombre: true } },
  sede: { select: { nombre: true } },
  equipo: { select: { codigo: true, nombre: true } },
  tipoMantenimiento: { select: { nombre: true } },
  tecnico: { select: { name: true } },
} satisfies Prisma.OrdenTrabajoSelect;

export type OrdenExportada = Prisma.OrdenTrabajoGetPayload<{
  select: typeof CAMPOS_EXPORTACION;
}>;

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * TCI-60 — tablero de indicadores.
   *
   * Devuelve todo en una sola llamada a proposito: son seis consultas que la
   * pantalla pinta junta, y partirlas en seis endpoints obligaria al frontend a
   * coordinar seis estados de carga para un mismo tablero.
   */
  async resumen(periodo: PeriodoDto) {
    const where = this.dondePeriodo(periodo);

    /*
     * Transaccion interactiva y no la forma de array: con cinco consultas de
     * tipos distintos, TypeScript pierde el tipado de `_count` en los
     * `groupBy`. Awaitandolas dentro del callback se resuelven una a una y de
     * paso se conserva la instantanea, que es lo que evita que el tablero
     * muestre un total que no cuadra con su propio desglose.
     */
    const { totales, porEstado, porPrioridad, porTipo, cerradas } =
      await this.prisma.$transaction(async (tx) => ({
        totales: await tx.ordenTrabajo.aggregate({
          where,
          _count: { _all: true },
          _sum: {
            horasTrabajadas: true,
            costoManoObra: true,
            costoRepuestos: true,
            costoTotal: true,
          },
        }),
        porEstado: await tx.ordenTrabajo.groupBy({
          by: ['estado'],
          where,
          orderBy: { estado: 'asc' },
          _count: true,
        }),
        porPrioridad: await tx.ordenTrabajo.groupBy({
          by: ['prioridad'],
          where,
          orderBy: { prioridad: 'asc' },
          _count: true,
        }),
        porTipo: await tx.ordenTrabajo.groupBy({
          by: ['tipoMantenimientoId'],
          where,
          orderBy: { tipoMantenimientoId: 'asc' },
          _count: true,
        }),
        cerradas: await tx.ordenTrabajo.findMany({
          where: { ...where, estado: OrdenEstado.COMPLETADA },
          select: { createdAt: true, fechaFin: true },
        }),
      }));

    // `groupBy` devuelve el id, no el nombre: se resuelve en una segunda
    // consulta en vez de con un join, que Prisma no ofrece para groupBy.
    const tipos = await this.prisma.tipoMantenimiento.findMany({
      where: { id: { in: porTipo.map((t) => t.tipoMantenimientoId) } },
      select: { id: true, nombre: true, color: true },
    });
    const nombreDeTipo = new Map(tipos.map((t) => [t.id, t]));

    return {
      periodo: { desde: periodo.desde ?? null, hasta: periodo.hasta ?? null },
      total: totales._count._all,
      abiertas: porEstado
        .filter(
          (e) =>
            e.estado !== OrdenEstado.COMPLETADA &&
            e.estado !== OrdenEstado.CANCELADA,
        )
        .reduce((suma, e) => suma + e._count, 0),
      porEstado: Object.fromEntries(porEstado.map((e) => [e.estado, e._count])),
      porPrioridad: Object.fromEntries(
        porPrioridad.map((p) => [p.prioridad, p._count]),
      ),
      porTipo: porTipo
        .map((t) => ({
          id: t.tipoMantenimientoId,
          nombre: nombreDeTipo.get(t.tipoMantenimientoId)?.nombre ?? '—',
          color: nombreDeTipo.get(t.tipoMantenimientoId)?.color ?? null,
          ordenes: t._count,
        }))
        .sort((a, b) => b.ordenes - a.ordenes),
      horasTotales: totales._sum.horasTrabajadas,
      costos: {
        manoObra: totales._sum.costoManoObra,
        repuestos: totales._sum.costoRepuestos,
        total: totales._sum.costoTotal,
      },
      diasPromedioResolucion: promedioDeDias(cerradas),
    };
  }

  /**
   * TCI-58 — reporte por tecnico y periodo.
   *
   * Incluye a los tecnicos activos sin ordenes en el periodo, con todo a cero:
   * un reporte de carga que omite a quien no trabajo no deja verlo, y eso es
   * justamente lo que se viene a mirar.
   */
  async porTecnico(periodo: PeriodoDto) {
    const where = this.dondePeriodo(periodo);

    const [tecnicos, ordenes] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: { rol: Rol.TECNICO, activo: true },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.ordenTrabajo.findMany({
        where: { ...where, tecnicoId: { not: null } },
        select: {
          tecnicoId: true,
          estado: true,
          createdAt: true,
          fechaFin: true,
          horasTrabajadas: true,
          costoTotal: true,
          tecnico: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    // Los tecnicos dados de baja que tengan ordenes en el periodo tambien
    // cuentan: su trabajo existio, y omitirlo descuadraria el total.
    const filas = new Map<
      string,
      { id: string; name: string; email: string; ordenes: typeof ordenes }
    >();
    for (const tecnico of tecnicos) {
      filas.set(tecnico.id, { ...tecnico, ordenes: [] });
    }
    for (const orden of ordenes) {
      const tecnico = orden.tecnico;
      if (!tecnico) continue;
      if (!filas.has(tecnico.id))
        filas.set(tecnico.id, { ...tecnico, ordenes: [] });
      filas.get(tecnico.id)!.ordenes.push(orden);
    }

    return {
      periodo: { desde: periodo.desde ?? null, hasta: periodo.hasta ?? null },
      tecnicos: [...filas.values()]
        .map((fila) => {
          const completadas = fila.ordenes.filter(
            (o) => o.estado === OrdenEstado.COMPLETADA,
          );
          const abiertas = fila.ordenes.filter(
            (o) =>
              o.estado !== OrdenEstado.COMPLETADA &&
              o.estado !== OrdenEstado.CANCELADA,
          );
          return {
            id: fila.id,
            nombre: fila.name,
            correo: fila.email,
            total: fila.ordenes.length,
            completadas: completadas.length,
            abiertas: abiertas.length,
            canceladas: fila.ordenes.filter(
              (o) => o.estado === OrdenEstado.CANCELADA,
            ).length,
            horas: sumarDecimales(fila.ordenes.map((o) => o.horasTrabajadas)),
            costoTotal: sumarDecimales(fila.ordenes.map((o) => o.costoTotal)),
            diasPromedioResolucion: promedioDeDias(completadas),
          };
        })
        .sort((a, b) => b.total - a.total),
    };
  }

  /** Las ordenes del periodo, en plano, para exportar (TCI-59). */
  ordenesDelPeriodo(periodo: PeriodoDto, limite: number) {
    return this.prisma.ordenTrabajo.findMany({
      where: this.dondePeriodo(periodo),
      select: CAMPOS_EXPORTACION,
      orderBy: { createdAt: 'desc' },
      take: limite,
    });
  }

  /**
   * El periodo se mide sobre `createdAt`: un reporte de agosto contiene lo que
   * entro en agosto.
   */
  private dondePeriodo(periodo: PeriodoDto): Prisma.OrdenTrabajoWhereInput {
    const where: Prisma.OrdenTrabajoWhereInput = { deletedAt: null };

    if (periodo.desde || periodo.hasta) {
      where.createdAt = {
        gte: periodo.desde ? inicioDelDia(periodo.desde) : undefined,
        lte: periodo.hasta ? finDelDia(periodo.hasta) : undefined,
      };
    }

    if (periodo.clienteId) where.clienteId = periodo.clienteId;
    if (periodo.tecnicoId) where.tecnicoId = periodo.tecnicoId;

    return where;
  }
}

/** Suma `Decimal` de Prisma sin pasar por `number`, que perderia centavos. */
function sumarDecimales(valores: (Prisma.Decimal | null)[]): Prisma.Decimal {
  return valores.reduce<Prisma.Decimal>(
    (total, valor) => (valor ? total.plus(valor) : total),
    new Prisma.Decimal(0),
  );
}

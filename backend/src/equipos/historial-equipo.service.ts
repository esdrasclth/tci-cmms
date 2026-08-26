import { Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { OrdenEstado } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

/**
 * TCI-57 — historial de mantenimiento por equipo.
 *
 * **Esta consulta no aplica el aislamiento por tecnico, y es deliberado.**
 *
 * En el resto del sistema un tecnico solo ve sus propias ordenes (regla 3 de
 * TCI-25). Aqui no: el historial completo de una maquina es justo lo que
 * permite diagnosticarla —"esto ya fallo en marzo, lo atendio otro"— y
 * ocultarle al tecnico las intervenciones ajenas no protege nada, solo le hace
 * repetir el diagnostico. Decision del cliente del 2026-08-26.
 *
 * Lo que si se acota es la proyeccion: se devuelve lo que sirve para
 * diagnosticar y nada mas. Sin costos, sin datos de contacto del cliente y sin
 * el historial interno de cada orden. Para el detalle completo hay que abrir la
 * orden, y ahi si vuelve a mandar el permiso de siempre.
 */

const ORDEN_DEL_HISTORIAL = {
  id: true,
  numero: true,
  titulo: true,
  estado: true,
  prioridad: true,
  trabajoRealizado: true,
  fechaProgramada: true,
  fechaInicio: true,
  fechaFin: true,
  horasTrabajadas: true,
  createdAt: true,
  tipoMantenimiento: {
    select: { id: true, codigo: true, nombre: true, color: true },
  },
  tecnico: { select: { id: true, name: true } },
} satisfies Prisma.OrdenTrabajoSelect;

@Injectable()
export class HistorialEquipoService {
  constructor(private readonly prisma: PrismaService) {}

  async historial(equipoId: string, limite = 50) {
    const equipo = await this.prisma.equipo.findFirst({
      where: { id: equipoId, deletedAt: null },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        tipo: true,
        marca: true,
        modelo: true,
        numeroSerie: true,
        ubicacionFisica: true,
        activo: true,
        cliente: { select: { id: true, nombre: true } },
        sede: { select: { id: true, nombre: true, ciudad: true } },
      },
    });
    if (!equipo) {
      throw new NotFoundException(`No existe el equipo ${equipoId}.`);
    }

    const where: Prisma.OrdenTrabajoWhereInput = {
      equipoId,
      deletedAt: null,
    };

    const [ordenes, porEstado, agregados] = await this.prisma.$transaction([
      this.prisma.ordenTrabajo.findMany({
        where,
        select: ORDEN_DEL_HISTORIAL,
        orderBy: { createdAt: 'desc' },
        take: limite,
      }),
      this.prisma.ordenTrabajo.groupBy({
        by: ['estado'] as const,
        where,
        orderBy: { estado: 'asc' },
        _count: true,
      }),
      this.prisma.ordenTrabajo.aggregate({
        where,
        _count: { _all: true },
        _sum: { horasTrabajadas: true },
        _min: { createdAt: true },
        _max: { createdAt: true },
      }),
    ]);

    const completadas = await this.prisma.ordenTrabajo.findMany({
      where: {
        ...where,
        estado: OrdenEstado.COMPLETADA,
        fechaFin: { not: null },
      },
      select: { createdAt: true, fechaFin: true },
    });

    return {
      equipo,
      resumen: {
        total: agregados._count._all,
        porEstado: Object.fromEntries(
          porEstado.map((fila) => [fila.estado, fila._count]),
        ),
        horasTotales: agregados._sum.horasTrabajadas,
        primeraIntervencion: agregados._min.createdAt,
        ultimaIntervencion: agregados._max.createdAt,
        /** Media de dias entre el alta y el cierre. `null` si no hay cerradas. */
        diasPromedioResolucion: promedioDeDias(completadas),
      },
      /** Las `limite` mas recientes. Para el resto se remite al listado general. */
      ordenes,
      truncado: agregados._count._all > ordenes.length,
    };
  }
}

/**
 * Media de dias entre el alta de la orden y su cierre.
 *
 * Se mide desde `createdAt` y no desde `fechaInicio`: al cliente le importa
 * cuanto tardo en resolverse desde que lo reporto, no cuanto estuvo el tecnico
 * con las manos encima. El tiempo de ejecucion sale de `horasTrabajadas`.
 */
export function promedioDeDias(
  ordenes: { createdAt: Date; fechaFin: Date | null }[],
): number | null {
  const cerradas = ordenes.filter((o) => o.fechaFin !== null);
  if (cerradas.length === 0) return null;

  const MS_POR_DIA = 1000 * 60 * 60 * 24;
  const suma = cerradas.reduce(
    (total, o) => total + (o.fechaFin!.getTime() - o.createdAt.getTime()),
    0,
  );
  return Number((suma / cerradas.length / MS_POR_DIA).toFixed(2));
}

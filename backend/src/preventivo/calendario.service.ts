import { Injectable } from '@nestjs/common';

import { finDelDia, inicioDelDia } from '../comun/fechas';
import {
  OrdenEstado,
  OrigenOrden,
  UnidadFrecuencia,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { PeriodoCalendarioDto } from './dto/plan.dto';
import { sumarFrecuencia } from './preventivo.service';

/**
 * TCI-51 — calendario de mantenimientos preventivos.
 *
 * Mezcla dos cosas que en la pantalla se ven igual pero no lo son:
 *
 *  - **Ordenes** ya generadas por un plan (TCI-50). Son hechos: existen, tienen
 *    numero y se pueden abrir.
 *  - **Proyecciones**: cuando le tocara a un equipo segun su plan, todavia sin
 *    orden. Son una prevision y cambian si el mantenimiento se adelanta o se
 *    atrasa, porque el vencimiento se cuenta desde el ultimo cierre real
 *    (TCI-49).
 *
 * Un calendario que solo mostrara ordenes estaria casi vacio —solo se generan
 * al vencer— y no serviria para planificar, que es justo para lo que se mira.
 */

/** Tope de repeticiones por equipo y plan, para que un rango largo no explote. */
const MAX_OCURRENCIAS = 24;

export interface EventoCalendario {
  fecha: Date;
  tipo: 'ORDEN' | 'PROYECCION';
  plan: { id: string; nombre: string };
  equipo: { id: string; codigo: string; nombre: string };
  cliente: { id: string; nombre: string };
  /** Presente solo cuando el evento es una orden ya generada. */
  orden: { id: string; numero: string; estado: OrdenEstado } | null;
  /** La fecha ya paso y sigue sin cerrarse. */
  vencido: boolean;
}

@Injectable()
export class CalendarioService {
  constructor(private readonly prisma: PrismaService) {}

  async calendario(periodo: PeriodoCalendarioDto) {
    const desde = inicioDelDia(periodo.desde);
    const hasta = finDelDia(periodo.hasta);
    const hoy = new Date();
    // "Vencido" se decide por dia y no por instante: una orden generada esta
    // manana para hoy no esta vencida, aunque su hora ya haya pasado.
    const arrancoHoy = inicioDelDia(hoy.toISOString().slice(0, 10));

    const eventos = [
      ...(await this.ordenesGeneradas(desde, hasta, arrancoHoy)),
      ...(await this.proyecciones(desde, hasta, hoy, arrancoHoy)),
    ];

    eventos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    return {
      periodo: { desde: periodo.desde, hasta: periodo.hasta },
      eventos,
    };
  }

  /** Lo que ya existe: ordenes nacidas de un plan, programadas en el rango. */
  private async ordenesGeneradas(
    desde: Date,
    hasta: Date,
    arrancoHoy: Date,
  ): Promise<EventoCalendario[]> {
    const ordenes = await this.prisma.ordenTrabajo.findMany({
      where: {
        origen: OrigenOrden.PREVENTIVO_AUTOMATICO,
        planId: { not: null },
        deletedAt: null,
        fechaProgramada: { gte: desde, lte: hasta },
      },
      select: {
        id: true,
        numero: true,
        estado: true,
        fechaProgramada: true,
        plan: { select: { id: true, nombre: true } },
        equipo: { select: { id: true, codigo: true, nombre: true } },
        cliente: { select: { id: true, nombre: true } },
      },
    });

    return (
      ordenes
        // Una orden preventiva siempre tiene equipo y plan; el filtro es para el
        // tipado, no porque se espere lo contrario.
        .filter((o) => o.equipo !== null && o.plan !== null)
        .map((o) => ({
          fecha: o.fechaProgramada!,
          tipo: 'ORDEN' as const,
          plan: o.plan!,
          equipo: o.equipo!,
          cliente: o.cliente,
          orden: { id: o.id, numero: o.numero, estado: o.estado },
          vencido:
            o.fechaProgramada! < arrancoHoy &&
            o.estado !== OrdenEstado.COMPLETADA &&
            o.estado !== OrdenEstado.CANCELADA,
        }))
    );
  }

  /**
   * Lo que vendra: para cada plan y equipo, las fechas en las que tocara dentro
   * del rango.
   *
   * Se omite la ocurrencia que ya tiene orden abierta, porque esa orden es
   * precisamente esa ocurrencia y saldria dos veces en el calendario.
   */
  private async proyecciones(
    desde: Date,
    hasta: Date,
    hoy: Date,
    arrancoHoy: Date,
  ): Promise<EventoCalendario[]> {
    const planes = await this.prisma.planMantenimiento.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        clienteId: true,
        tipoEquipoId: true,
        frecuenciaValor: true,
        frecuenciaUnidad: true,
      },
    });

    const eventos: EventoCalendario[] = [];
    if (planes.length === 0) return eventos;

    // Los equipos y sus ordenes de una vez, no un `findMany` por plan: la
    // consulta era una por fila de la tabla de planes.
    const todosLosEquipos = await this.prisma.equipo.findMany({
      where: {
        tipoEquipoId: { in: planes.map((p) => p.tipoEquipoId) },
        activo: true,
        deletedAt: null,
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        clienteId: true,
        tipoEquipoId: true,
        cliente: { select: { id: true, nombre: true } },
      },
    });
    if (todosLosEquipos.length === 0) return eventos;

    const ordenesDePlan = await this.prisma.ordenTrabajo.findMany({
      where: {
        planId: { in: planes.map((p) => p.id) },
        equipoId: { in: todosLosEquipos.map((e) => e.id) },
        deletedAt: null,
      },
      select: {
        planId: true,
        equipoId: true,
        estado: true,
        fechaFin: true,
        fechaProgramada: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const porPar = new Map<string, typeof ordenesDePlan>();
    for (const orden of ordenesDePlan) {
      const k = `${orden.planId!}|${orden.equipoId!}`;
      const lista = porPar.get(k) ?? [];
      lista.push(orden);
      porPar.set(k, lista);
    }

    for (const plan of planes) {
      const equipos = todosLosEquipos.filter(
        (e) =>
          e.tipoEquipoId === plan.tipoEquipoId &&
          (!plan.clienteId || e.clienteId === plan.clienteId),
      );

      for (const equipo of equipos) {
        const suyas = porPar.get(`${plan.id}|${equipo.id}`) ?? [];

        const ultimoCierre = suyas.find(
          (o) => o.estado === OrdenEstado.COMPLETADA && o.fechaFin !== null,
        )?.fechaFin;

        const abierta = suyas.find(
          (o) =>
            o.estado !== OrdenEstado.COMPLETADA &&
            o.estado !== OrdenEstado.CANCELADA,
        );

        for (const fecha of this.ocurrencias(
          ultimoCierre ?? null,
          plan.frecuenciaValor,
          plan.frecuenciaUnidad,
          hasta,
          hoy,
        )) {
          if (fecha < desde) continue;

          // Esa ocurrencia ya se materializo en una orden: la pinta el otro
          // camino, con su numero.
          if (
            abierta?.fechaProgramada &&
            mismoDia(abierta.fechaProgramada, fecha)
          ) {
            continue;
          }

          eventos.push({
            fecha,
            tipo: 'PROYECCION',
            plan: { id: plan.id, nombre: plan.nombre },
            equipo: {
              id: equipo.id,
              codigo: equipo.codigo,
              nombre: equipo.nombre,
            },
            cliente: equipo.cliente,
            orden: null,
            vencido: fecha < arrancoHoy,
          });
        }
      }
    }

    return eventos;
  }

  /**
   * Las fechas en las que tocara, desde el ultimo cierre y hasta el final del
   * rango.
   *
   * Sin cierre previo la primera ocurrencia es hoy: nunca se le ha hecho, asi
   * que toca ya. A partir de ahi se suma la frecuencia repetidamente, de modo
   * que un plan mensual marca todos los meses del rango y no solo el primero.
   */
  private ocurrencias(
    ultimoCierre: Date | null,
    valor: number,
    unidad: UnidadFrecuencia,
    hasta: Date,
    hoy: Date,
  ): Date[] {
    const fechas: Date[] = [];
    let cursor = ultimoCierre
      ? sumarFrecuencia(ultimoCierre, valor, unidad)
      : hoy;

    for (let i = 0; i < MAX_OCURRENCIAS && cursor <= hasta; i++) {
      fechas.push(cursor);
      cursor = sumarFrecuencia(cursor, valor, unidad);
    }

    return fechas;
  }
}

function mismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

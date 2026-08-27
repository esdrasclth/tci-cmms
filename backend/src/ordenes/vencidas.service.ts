import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { EventoNotificable, OrdenEstado, Rol } from '../generated/prisma/enums';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Aviso de orden vencida.
 *
 * `fechaLimite` se guardaba desde el principio pero nadie miraba si pasaba: un
 * plazo que solo se descubre al repasar el listado a mano no es un plazo.
 *
 * **Se avisa una sola vez por orden.** La alternativa —recordarlo cada dia
 * mientras siga abierta— convierte el aviso en ruido, y a la tercera manana
 * nadie los lee. Para saber si ya se aviso no hace falta una columna: basta
 * mirar si existe una notificacion de este evento apuntando a esa orden.
 */
@Injectable()
export class OrdenesVencidasService {
  private readonly log = new Logger(OrdenesVencidasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /**
   * A las 8:00: una hora despues del resumen preventivo, para que los avisos
   * del dia no lleguen todos en el mismo minuto.
   */
  @Cron(process.env.VENCIDAS_CRON ?? '0 8 * * *', { name: 'ordenes-vencidas' })
  async porHorario(): Promise<void> {
    if (process.env.AVISOS_VENCIDAS === 'false') {
      this.log.log('Avisos de vencimiento desactivados por configuracion.');
      return;
    }

    const avisadas = await this.avisar();
    this.log.log(
      avisadas === 0
        ? 'Sin ordenes vencidas nuevas.'
        : `Avisadas ${avisadas} orden(es) vencida(s).`,
    );
  }

  /** Las que ya pasaron su fecha limite y siguen abiertas. */
  async vencidas() {
    return this.prisma.ordenTrabajo.findMany({
      where: {
        deletedAt: null,
        fechaLimite: { lt: new Date() },
        // Se enumeran los estados finales y no los abiertos: son dos y no
        // cambian, mientras que los intermedios ya han crecido antes.
        estado: { notIn: [OrdenEstado.COMPLETADA, OrdenEstado.CANCELADA] },
      },
      select: {
        id: true,
        numero: true,
        titulo: true,
        estado: true,
        fechaLimite: true,
        tecnicoId: true,
        cliente: { select: { nombre: true } },
      },
      orderBy: { fechaLimite: 'asc' },
    });
  }

  /**
   * Emite el aviso de las que aun no lo tienen. Devuelve cuantas se avisaron.
   */
  async avisar(): Promise<number> {
    const candidatas = await this.vencidas();
    if (candidatas.length === 0) return 0;

    const enlaces = candidatas.map((o) => `/panel/ordenes/${o.id}`);

    // Un solo `findMany` para todas: preguntar orden por orden si ya se aviso
    // seria una consulta por orden vencida.
    const yaAvisadas = await this.prisma.notificacion.findMany({
      where: {
        evento: EventoNotificable.ORDEN_VENCIDA,
        enlace: { in: enlaces },
      },
      select: { enlace: true },
      distinct: ['enlace'],
    });
    const avisados = new Set(yaAvisadas.map((n) => n.enlace));

    const pendientes = candidatas.filter(
      (o) => !avisados.has(`/panel/ordenes/${o.id}`),
    );
    if (pendientes.length === 0) return 0;

    const admins = await this.prisma.user.findMany({
      where: { rol: Rol.ADMIN, activo: true },
      select: { id: true },
    });
    const idsAdmin = admins.map((a) => a.id);

    const ahora = Date.now();
    for (const orden of pendientes) {
      const destinatarios = [...idsAdmin];
      if (orden.tecnicoId) destinatarios.push(orden.tecnicoId);

      const dias = Math.max(
        1,
        Math.floor(
          (ahora - (orden.fechaLimite?.getTime() ?? ahora)) / 86_400_000,
        ),
      );

      await this.notificaciones.emitir({
        evento: EventoNotificable.ORDEN_VENCIDA,
        destinatarios,
        enlace: `/panel/ordenes/${orden.id}`,
        datos: {
          numero: orden.numero,
          titulo: orden.titulo,
          cliente: orden.cliente.nombre,
          limite: orden.fechaLimite?.toLocaleDateString('es-HN') ?? '—',
          estado: ETIQUETA_ESTADO[orden.estado],
          dias: dias === 1 ? '1 dia' : `${dias} dias`,
        },
      });
    }

    return pendientes.length;
  }
}

/** Para que el texto del aviso diga "en proceso" y no "EN_PROCESO". */
const ETIQUETA_ESTADO: Record<OrdenEstado, string> = {
  PENDIENTE: 'pendiente',
  ASIGNADA: 'asignada',
  EN_PROCESO: 'en proceso',
  EN_ESPERA: 'en espera',
  COMPLETADA: 'completada',
  CANCELADA: 'cancelada',
};

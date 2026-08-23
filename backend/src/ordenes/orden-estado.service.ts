import {
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';

import { OrdenEstado, Rol, TipoHistorial } from '../generated/prisma/enums';

/**
 * Maquina de estados de la Orden de Trabajo — TCI-78.
 *
 * Es la unica fuente de verdad sobre que transiciones existen, quien puede
 * ejecutarlas y cuales exigen motivo (regla 2 de docs/flujo-ordenes.md). El
 * estado NUNCA se cambia con un PATCH generico: cada transicion tiene su propio
 * endpoint de accion y todas pasan por aqui.
 *
 * Este servicio es puro: no toca la base de datos. Eso lo hace OrdenesService,
 * que lo consulta antes de escribir.
 */

export const ACCIONES = [
  'asignar',
  'reasignar',
  'desasignar',
  'iniciar',
  'pausar',
  'reanudar',
  'completar',
  'cancelar',
  'reabrir',
] as const;

export type AccionOrden = (typeof ACCIONES)[number];

interface Transicion {
  desde: OrdenEstado[];
  hacia: OrdenEstado;
  /** Solo un ADMIN puede ejecutarla. Si es false, tambien el tecnico asignado. */
  soloAdmin: boolean;
  /** Exige un `motivo` no vacio, que queda en el historial. */
  requiereMotivo: boolean;
  /** Que tipo de asiento escribe en OrdenHistorial (TCI-29). */
  historial: TipoHistorial;
}

const TRANSICIONES: Record<AccionOrden, Transicion> = {
  asignar: {
    desde: [OrdenEstado.PENDIENTE],
    hacia: OrdenEstado.ASIGNADA,
    soloAdmin: true,
    requiereMotivo: false,
    historial: TipoHistorial.ASIGNACION,
  },
  reasignar: {
    desde: [OrdenEstado.ASIGNADA],
    hacia: OrdenEstado.ASIGNADA,
    soloAdmin: true,
    requiereMotivo: false,
    historial: TipoHistorial.ASIGNACION,
  },
  desasignar: {
    desde: [OrdenEstado.ASIGNADA],
    hacia: OrdenEstado.PENDIENTE,
    soloAdmin: true,
    requiereMotivo: false,
    historial: TipoHistorial.ASIGNACION,
  },
  iniciar: {
    desde: [OrdenEstado.ASIGNADA],
    hacia: OrdenEstado.EN_PROCESO,
    soloAdmin: false,
    requiereMotivo: false,
    historial: TipoHistorial.CAMBIO_ESTADO,
  },
  pausar: {
    desde: [OrdenEstado.EN_PROCESO],
    hacia: OrdenEstado.EN_ESPERA,
    soloAdmin: false,
    requiereMotivo: true,
    historial: TipoHistorial.CAMBIO_ESTADO,
  },
  reanudar: {
    desde: [OrdenEstado.EN_ESPERA],
    hacia: OrdenEstado.EN_PROCESO,
    soloAdmin: false,
    requiereMotivo: false,
    historial: TipoHistorial.CAMBIO_ESTADO,
  },
  completar: {
    desde: [OrdenEstado.EN_PROCESO],
    hacia: OrdenEstado.COMPLETADA,
    soloAdmin: false,
    requiereMotivo: false,
    historial: TipoHistorial.CAMBIO_ESTADO,
  },
  cancelar: {
    desde: [
      OrdenEstado.PENDIENTE,
      OrdenEstado.ASIGNADA,
      OrdenEstado.EN_PROCESO,
      OrdenEstado.EN_ESPERA,
    ],
    hacia: OrdenEstado.CANCELADA,
    soloAdmin: true,
    requiereMotivo: true,
    historial: TipoHistorial.CAMBIO_ESTADO,
  },
  reabrir: {
    desde: [OrdenEstado.COMPLETADA],
    hacia: OrdenEstado.EN_PROCESO,
    soloAdmin: true,
    requiereMotivo: true,
    historial: TipoHistorial.CAMBIO_ESTADO,
  },
};

/** Estados finales sin salida, salvo `reabrir` desde COMPLETADA. */
export const ESTADOS_FINALES: OrdenEstado[] = [
  OrdenEstado.COMPLETADA,
  OrdenEstado.CANCELADA,
];

export interface ContextoAccion {
  accion: AccionOrden;
  estadoActual: OrdenEstado;
  rol: Rol;
  usuarioId: string;
  /** Tecnico asignado a la orden, si tiene. */
  tecnicoId: string | null;
  motivo?: string | null;
}

export interface ResultadoTransicion {
  nuevoEstado: OrdenEstado;
  tipoHistorial: TipoHistorial;
}

@Injectable()
export class OrdenEstadoService {
  /**
   * Valida una transicion y devuelve el estado destino.
   *
   * - Transicion inexistente para el estado actual -> 422 (regla del §2).
   * - Permiso insuficiente -> 403.
   * - Falta `motivo` donde es obligatorio -> 422 (regla 5).
   */
  validar(ctx: ContextoAccion): ResultadoTransicion {
    const transicion = TRANSICIONES[ctx.accion];

    if (!transicion.desde.includes(ctx.estadoActual)) {
      throw new UnprocessableEntityException(
        `No se puede '${ctx.accion}' una orden en estado ${ctx.estadoActual}. ` +
          `Estados validos: ${transicion.desde.join(', ')}.`,
      );
    }

    const esAdmin = ctx.rol === Rol.ADMIN;

    if (transicion.soloAdmin && !esAdmin) {
      throw new ForbiddenException(
        `La accion '${ctx.accion}' esta reservada a un administrador.`,
      );
    }

    // Regla 3: un tecnico solo opera sus propias ordenes. Se valida aqui y no
    // solo en el guard de rol (TCI-33), porque el guard no conoce la orden.
    if (!esAdmin && ctx.tecnicoId !== ctx.usuarioId) {
      throw new ForbiddenException(
        'Solo el tecnico asignado a la orden puede ejecutar esta accion.',
      );
    }

    if (transicion.requiereMotivo && !ctx.motivo?.trim()) {
      throw new UnprocessableEntityException(
        `La accion '${ctx.accion}' exige un motivo.`,
      );
    }

    return {
      nuevoEstado: transicion.hacia,
      tipoHistorial: transicion.historial,
    };
  }

  /**
   * Acciones que el usuario actual puede ejecutar sobre la orden.
   *
   * El frontend (TCI-42) pinta botones a partir de esto; nunca decide el mismo
   * que es valido. Se expone en el detalle de la orden.
   */
  accionesDisponibles(
    estadoActual: OrdenEstado,
    rol: Rol,
    usuarioId: string,
    tecnicoId: string | null,
  ): AccionOrden[] {
    return ACCIONES.filter((accion) => {
      try {
        this.validar({
          accion,
          estadoActual,
          rol,
          usuarioId,
          tecnicoId,
          // El motivo lo aporta el usuario en el momento: no descarta la accion.
          motivo: TRANSICIONES[accion].requiereMotivo ? 'x' : undefined,
        });
        return true;
      } catch {
        return false;
      }
    });
  }

  requiereMotivo(accion: AccionOrden): boolean {
    return TRANSICIONES[accion].requiereMotivo;
  }
}

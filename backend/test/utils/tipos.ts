import type { Response } from 'supertest';

import type {
  OrdenEstado,
  Prioridad,
  TipoHistorial,
} from '../../src/generated/prisma/enums';

/**
 * Forma de lo que devuelven los endpoints de ordenes, vista desde el cliente.
 *
 * No se reutilizan los tipos de Prisma a proposito: lo que viaja por HTTP es
 * JSON, asi que los `DateTime` llegan como string ISO y los `Decimal` como
 * string. Declararlo aqui obliga a que los tests asuman exactamente lo que ve
 * el frontend, y de paso satisface el eslint estricto del repo, que rechaza el
 * `any` con el que supertest tipa `response.body`.
 */

export interface AsientoHistorial {
  id: string;
  tipo: TipoHistorial;
  estadoAnterior: OrdenEstado | null;
  estadoNuevo: OrdenEstado | null;
  campo: string | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
  comentario: string | null;
  usuarioId: string;
  createdAt: string;
}

export interface OrdenLista {
  id: string;
  numero: string;
  titulo: string;
  estado: OrdenEstado;
  prioridad: Prioridad;
  tecnicoId: string | null;
  cliente: { id: string; nombre: string };
  tipoMantenimiento: { id: string; codigo: string; nombre: string };
  tecnico: { id: string; name: string; email: string } | null;
}

export interface OrdenDetalle extends OrdenLista {
  origen: string;
  descripcionProblema: string;
  trabajoRealizado: string | null;
  creadoPorId: string;
  fechaProgramada: string | null;
  fechaLimite: string | null;
  fechaAsignacion: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  horasTrabajadas: string | null;
  costoManoObra: string;
  costoRepuestos: string;
  costoTotal: string;
  historial: AsientoHistorial[];
  adjuntos: unknown[];
  /** Solo lo trae GET /ordenes/:id y los endpoints que releen por ahi. */
  accionesDisponibles?: string[];
}

export interface ListadoOrdenes {
  data: OrdenLista[];
  meta: { total: number; page: number; perPage: number; totalPages: number };
}

export interface ErrorHttp {
  statusCode: number;
  message: string | string[];
  error?: string;
}

/** Lee el cuerpo de una respuesta de supertest con un tipo concreto. */
export function cuerpo<T>(respuesta: Response): T {
  return respuesta.body as T;
}

import { apiGet, apiPost } from "./api";

/**
 * Espejo de lo que devuelve `GET /api/ordenes` (INCLUDE_LISTA en
 * backend/src/ordenes/ordenes.service.ts). Se escriben a mano en vez de
 * generarlos: son pocos campos y evita acoplar el build del frontend al del
 * backend. Si el backend cambia el `include`, hay que tocarlos aqui.
 */

export const ESTADOS = [
  "PENDIENTE",
  "ASIGNADA",
  "EN_PROCESO",
  "EN_ESPERA",
  "COMPLETADA",
  "CANCELADA",
] as const;

export type Estado = (typeof ESTADOS)[number];

export const PRIORIDADES = ["BAJA", "MEDIA", "ALTA", "URGENTE"] as const;
export type Prioridad = (typeof PRIORIDADES)[number];

export interface OrdenListada {
  id: string;
  numero: string;
  titulo: string;
  estado: Estado;
  prioridad: Prioridad;
  fechaProgramada: string | null;
  fechaLimite: string | null;
  createdAt: string;
  cliente: { id: string; nombre: string };
  sede: { id: string; nombre: string; ciudad: string | null } | null;
  equipo: { id: string; codigo: string; nombre: string } | null;
  tipoMantenimiento: {
    id: string;
    codigo: string;
    nombre: string;
    color: string | null;
  };
  tecnico: { id: string; name: string; email: string } | null;
}

export interface PaginaOrdenes {
  data: OrdenListada[];
  meta: { total: number; page: number; perPage: number; totalPages: number };
}

export interface FiltrosOrdenes {
  estado?: Estado[];
  page?: number;
  perPage?: number;
}

export function listarOrdenes(filtros: FiltrosOrdenes = {}) {
  const params = new URLSearchParams();
  // El backend acepta la lista separada por comas.
  if (filtros.estado?.length) params.set("estado", filtros.estado.join(","));
  if (filtros.page) params.set("page", String(filtros.page));
  if (filtros.perPage) params.set("perPage", String(filtros.perPage));

  return apiGet<PaginaOrdenes>("/ordenes", params);
}

/** Etiquetas legibles. Los valores crudos del enum no se muestran nunca. */
export const ETIQUETA_ESTADO: Record<Estado, string> = {
  PENDIENTE: "Pendiente",
  ASIGNADA: "Asignada",
  EN_PROCESO: "En proceso",
  EN_ESPERA: "En espera",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
};

export const ETIQUETA_PRIORIDAD: Record<Prioridad, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
  URGENTE: "Urgente",
};

/**
 * El rojo institucional se reserva para acciones primarias y para lo urgente;
 * los estados usan colores neutros para no competir con el.
 */
export const COLOR_ESTADO: Record<Estado, string> = {
  PENDIENTE: "bg-tci-borde text-tci-grafito",
  ASIGNADA: "bg-blue-100 text-blue-800",
  EN_PROCESO: "bg-amber-100 text-amber-900",
  EN_ESPERA: "bg-orange-100 text-orange-900",
  COMPLETADA: "bg-emerald-100 text-emerald-900",
  CANCELADA: "bg-tci-humo text-tci-gris line-through",
};

export const COLOR_PRIORIDAD: Record<Prioridad, string> = {
  BAJA: "text-tci-gris",
  MEDIA: "text-tci-grafito",
  ALTA: "text-orange-700 font-bold",
  URGENTE: "text-tci-rojo font-bold",
};

export function formatearFecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-HN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Detalle de una orden (TCI-42)
// ---------------------------------------------------------------------------

export const ACCIONES = [
  "asignar",
  "reasignar",
  "desasignar",
  "iniciar",
  "pausar",
  "reanudar",
  "completar",
  "cancelar",
  "reabrir",
] as const;

export type Accion = (typeof ACCIONES)[number];

export type TipoHistorial =
  | "CAMBIO_ESTADO"
  | "ASIGNACION"
  | "COMENTARIO"
  | "EDICION";

export interface AsientoHistorial {
  id: string;
  tipo: TipoHistorial;
  estadoAnterior: Estado | null;
  estadoNuevo: Estado | null;
  campo: string | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
  comentario: string | null;
  createdAt: string;
  usuario: { id: string; name: string };
}

export interface OrdenDetalle extends OrdenListada {
  descripcionProblema: string;
  trabajoRealizado: string | null;
  fechaAsignacion: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  horasTrabajadas: string | number | null;
  costoManoObra: string | number;
  costoTotal: string | number;
  moneda: string;
  creadoPor: { id: string; name: string; email: string };
  historial: AsientoHistorial[];
  /**
   * Lo calcula el backend segun estado y rol (TCI-78 regla 2). El frontend solo
   * pinta estos botones; nunca decide el si una transicion es valida.
   */
  accionesDisponibles: Accion[];
}

export interface Tecnico {
  id: string;
  name: string;
  email: string;
  rol: "ADMIN" | "TECNICO";
  activo: boolean;
}

/** Que pide cada accion. Espeja TRANSICIONES de orden-estado.service.ts. */
export const CONFIG_ACCION: Record<
  Accion,
  {
    etiqueta: string;
    pide: "nada" | "motivo" | "tecnico" | "cierre";
    destacada?: boolean;
    destructiva?: boolean;
  }
> = {
  asignar: { etiqueta: "Asignar tecnico", pide: "tecnico", destacada: true },
  reasignar: { etiqueta: "Reasignar", pide: "tecnico" },
  desasignar: { etiqueta: "Quitar asignacion", pide: "nada" },
  iniciar: { etiqueta: "Iniciar trabajo", pide: "nada", destacada: true },
  pausar: { etiqueta: "Pausar", pide: "motivo" },
  reanudar: { etiqueta: "Reanudar", pide: "nada", destacada: true },
  completar: { etiqueta: "Completar", pide: "cierre", destacada: true },
  cancelar: { etiqueta: "Cancelar orden", pide: "motivo", destructiva: true },
  reabrir: { etiqueta: "Reabrir", pide: "motivo" },
};

export function obtenerOrden(id: string) {
  return apiGet<OrdenDetalle>(`/ordenes/${id}`);
}

export function ejecutarAccion(id: string, accion: Accion, cuerpo: unknown) {
  return apiPost<unknown>(`/ordenes/${id}/${accion}`, cuerpo);
}

export function comentarOrden(id: string, comentario: string) {
  return apiPost<OrdenDetalle>(`/ordenes/${id}/comentarios`, { comentario });
}

export function listarTecnicos() {
  const params = new URLSearchParams({ rol: "TECNICO", activo: "true" });
  return apiGet<Tecnico[]>("/usuarios", params);
}

export function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-HN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatearDinero(valor: string | number, moneda = "HNL"): string {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: moneda,
  }).format(Number(valor));
}

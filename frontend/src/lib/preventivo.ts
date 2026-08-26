import { apiDelete, apiGet, apiPatch, apiPost } from "./api";
import type { Prioridad } from "./ordenes";

/**
 * Módulo 7 — mantenimiento preventivo (TCI-49).
 *
 * Un plan dice "todo equipo de este tipo lleva este mantenimiento cada N
 * unidades de tiempo". La generación automática de las órdenes es `TCI-50` y
 * todavía no existe: lo que hay aquí es la definición del plan y el cálculo de
 * a quién alcanza y cuándo le toca.
 */

export type UnidadFrecuencia = "DIAS" | "SEMANAS" | "MESES";

/** El catálogo que sustituye al campo de texto libre `Equipo.tipo`. */
export interface TipoEquipoActivo {
  id: string;
  nombre: string;
}

export interface TipoEquipo extends TipoEquipoActivo {
  activo: boolean;
  createdAt: string;
  equipos: number;
  planes: number;
}

export interface Plan {
  id: string;
  nombre: string;
  descripcion: string | null;
  frecuenciaValor: number;
  frecuenciaUnidad: UnidadFrecuencia;
  /** Cuántos días antes del vencimiento se avisa (`TCI-52`). */
  diasAnticipacion: number;
  prioridad: Prioridad;
  instrucciones: string | null;
  activo: boolean;
  createdAt: string;
  tipoEquipo: { id: string; nombre: string; activo: boolean };
  /** Nulo = aplica a todos los clientes. */
  cliente: { id: string; nombre: string } | null;
  tipoMantenimiento: { id: string; codigo: string; nombre: string };
}

export interface PlanListado extends Plan {
  /** A cuántos equipos alcanza hoy. */
  equipos: number;
}

export interface EquipoDelPlan {
  id: string;
  codigo: string;
  nombre: string;
  cliente: { id: string; nombre: string };
  sede: { id: string; nombre: string } | null;
  ultimoPreventivo: { id: string; numero: string; fecha: string } | null;
  proximoVencimiento: string | null;
  vencido: boolean;
  porVencer: boolean;
}

export interface AlcanceDelPlan {
  plan: Plan;
  equipos: EquipoDelPlan[];
}

export type DatosPlan = {
  nombre: string;
  descripcion?: string;
  tipoEquipoId: string;
  clienteId?: string;
  tipoMantenimientoId: string;
  frecuenciaValor: number;
  frecuenciaUnidad: UnidadFrecuencia;
  diasAnticipacion?: number;
  prioridad?: Prioridad;
  instrucciones?: string;
};

// ---------------------------------------------------------------------------
// Catálogo de tipos de equipo
// ---------------------------------------------------------------------------

export function listarTiposEquipoActivos() {
  return apiGet<TipoEquipoActivo[]>("/tipos-equipo");
}

export function listarTiposEquipoAdmin(
  filtros: { q?: string; activo?: boolean } = {},
) {
  const params = new URLSearchParams();
  if (filtros.q?.trim()) params.set("q", filtros.q.trim());
  if (filtros.activo !== undefined) params.set("activo", String(filtros.activo));
  return apiGet<TipoEquipo[]>("/tipos-equipo/admin", params);
}

export function crearTipoEquipo(nombre: string) {
  return apiPost<TipoEquipo>("/tipos-equipo", { nombre });
}

export function actualizarTipoEquipo(
  id: string,
  datos: { nombre?: string; activo?: boolean },
) {
  return apiPatch<TipoEquipo>(`/tipos-equipo/${id}`, datos);
}

export function eliminarTipoEquipo(id: string) {
  return apiDelete(`/tipos-equipo/${id}`);
}

// ---------------------------------------------------------------------------
// Planes
// ---------------------------------------------------------------------------

export function listarPlanes(
  filtros: { q?: string; activo?: boolean; tipoEquipoId?: string } = {},
) {
  const params = new URLSearchParams();
  if (filtros.q?.trim()) params.set("q", filtros.q.trim());
  if (filtros.activo !== undefined) params.set("activo", String(filtros.activo));
  if (filtros.tipoEquipoId) params.set("tipoEquipoId", filtros.tipoEquipoId);
  return apiGet<PlanListado[]>("/planes-mantenimiento", params);
}

export function obtenerAlcanceDelPlan(id: string) {
  return apiGet<AlcanceDelPlan>(`/planes-mantenimiento/${id}/equipos`);
}

export function crearPlan(datos: DatosPlan) {
  return apiPost<Plan>("/planes-mantenimiento", datos);
}

/**
 * `tipoEquipoId` no se puede cambiar: convertiría el plan en otro distinto y
 * dejaría colgadas las órdenes que ya generó. El backend lo rechaza con 400.
 */
export function actualizarPlan(
  id: string,
  // `clienteId` se saca del `Omit` y se redeclara: en una interseccion,
  // `string` y `string | null` se cruzan en `string` y no dejarian mandar el
  // `null` que quita el acote por cliente.
  datos: Partial<Omit<DatosPlan, "tipoEquipoId" | "clienteId">> & {
    activo?: boolean;
    clienteId?: string | null;
  },
) {
  return apiPatch<Plan>(`/planes-mantenimiento/${id}`, datos);
}

export function eliminarPlan(id: string) {
  return apiDelete(`/planes-mantenimiento/${id}`);
}

// ---------------------------------------------------------------------------
// Generación automática (TCI-50)
// ---------------------------------------------------------------------------

export interface ResultadoGeneracion {
  /** `false` si otra instancia estaba generando y esta pasada se saltó. */
  ejecutado: boolean;
  planes: number;
  creadas: { plan: string; equipo: string; numero: string }[];
  omitidas: { plan: string; equipo: string; motivo: string }[];
}

/**
 * Dispara una pasada del generador. Sin `planId` recorre todos los planes
 * activos.
 *
 * Existe además del horario diario porque un plan recién creado no debería
 * esperar a mañana para producir sus órdenes.
 */
export function generarOrdenes(planId?: string) {
  const ruta = planId
    ? `/planes-mantenimiento/${planId}/generar`
    : "/planes-mantenimiento/generar";
  return apiPost<ResultadoGeneracion>(ruta, {});
}

// ---------------------------------------------------------------------------
// Presentación
// ---------------------------------------------------------------------------

const SINGULAR: Record<UnidadFrecuencia, string> = {
  DIAS: "día",
  SEMANAS: "semana",
  MESES: "mes",
};

const PLURAL: Record<UnidadFrecuencia, string> = {
  DIAS: "días",
  SEMANAS: "semanas",
  MESES: "meses",
};

export const UNIDADES: { valor: UnidadFrecuencia; etiqueta: string }[] = [
  { valor: "DIAS", etiqueta: "Días" },
  { valor: "SEMANAS", etiqueta: "Semanas" },
  { valor: "MESES", etiqueta: "Meses" },
];

/** "Cada 3 meses", "Cada mes". */
export function describirFrecuencia(
  valor: number,
  unidad: UnidadFrecuencia,
): string {
  if (valor === 1) return `Cada ${SINGULAR[unidad]}`;
  return `Cada ${valor} ${PLURAL[unidad]}`;
}

export function formatearFechaCorta(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-HN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

/**
 * Inventario y repuestos — TCI-45, TCI-46 y TCI-47.
 *
 * Los decimales llegan de la API como `string`, igual que los costos de una
 * orden: son `Decimal` de Postgres y no `number`. Se declaran como
 * `string | number` y se convierten donde hace falta calcular, nunca antes.
 *
 * Hay dos lecturas del catálogo y no son intercambiables, mismo criterio que en
 * los tipos de mantenimiento (TCI-30):
 *
 *  - `listarDisponibles` (`GET /repuestos`) — lo que puede imputar un técnico:
 *    activos y con existencia. Ofrecer uno agotado solo produce un 422 que el
 *    usuario no sabría interpretar.
 *  - `listarRepuestosAdmin` (`GET /repuestos/admin`) — la pantalla de gestión,
 *    con los desactivados, el costo y el aviso de mínimos.
 */

export type Decimal = string | number;

/** Lo que necesita el técnico para elegir qué imputar. */
export interface RepuestoDisponible {
  id: string;
  codigo: string;
  nombre: string;
  unidadMedida: string;
  stockActual: Decimal;
  costoUnitario: Decimal;
  moneda: string;
}

export interface Repuesto extends RepuestoDisponible {
  descripcion: string | null;
  stockMinimo: Decimal;
  activo: boolean;
  createdAt: string;
  /** En cuántas órdenes se imputó. Si es > 0 no se puede borrar, solo desactivar. */
  ordenes: number;
  /** TCI-47: está en o por debajo del mínimo. Lo calcula el backend. */
  bajoMinimo: boolean;
}

export interface AlertaRepuesto {
  id: string;
  codigo: string;
  nombre: string;
  unidadMedida: string;
  stockActual: Decimal;
  stockMinimo: Decimal;
}

export interface MovimientoInventario {
  id: string;
  tipo: "ENTRADA" | "SALIDA";
  cantidad: Decimal;
  stockResultante: Decimal;
  motivo: string | null;
  createdAt: string;
  usuario: { id: string; name: string };
  orden: { id: string; numero: string } | null;
}

/** Una línea de consumo de una orden (TCI-46). */
export interface LineaConsumo {
  id: string;
  cantidad: Decimal;
  costoUnitario: Decimal;
  createdAt: string;
  repuesto: {
    id: string;
    codigo: string;
    nombre: string;
    unidadMedida: string;
    stockActual: Decimal;
    stockMinimo: Decimal;
    moneda: string;
  };
}

export type DatosRepuesto = {
  codigo: string;
  nombre: string;
  descripcion?: string;
  unidadMedida: string;
  stockActual?: number;
  stockMinimo?: number;
  costoUnitario?: number;
};

// ---------------------------------------------------------------------------
// Catálogo (TCI-45)
// ---------------------------------------------------------------------------

export function listarDisponibles() {
  return apiGet<RepuestoDisponible[]>("/repuestos");
}

export function listarRepuestosAdmin(
  filtros: { q?: string; activo?: boolean; bajoMinimo?: boolean } = {},
) {
  const params = new URLSearchParams();
  if (filtros.q?.trim()) params.set("q", filtros.q.trim());
  if (filtros.activo !== undefined) params.set("activo", String(filtros.activo));
  if (filtros.bajoMinimo) params.set("bajoMinimo", "true");
  return apiGet<Repuesto[]>("/repuestos/admin", params);
}

export function crearRepuesto(datos: DatosRepuesto) {
  return apiPost<Repuesto>("/repuestos", datos);
}

/**
 * `stockActual` no está aquí: solo se mueve con entradas y salidas, que dejan
 * asiento en el libro. El backend rechaza el campo con un 400.
 */
export function actualizarRepuesto(
  id: string,
  datos: Partial<Omit<DatosRepuesto, "stockActual">> & { activo?: boolean },
) {
  return apiPatch<Repuesto>(`/repuestos/${id}`, datos);
}

export function eliminarRepuesto(id: string) {
  return apiDelete(`/repuestos/${id}`);
}

// ---------------------------------------------------------------------------
// Movimientos de almacén
// ---------------------------------------------------------------------------

export function registrarEntrada(
  id: string,
  datos: { cantidad: number; motivo: string },
) {
  return apiPost<Repuesto>(`/repuestos/${id}/entradas`, datos);
}

export function registrarSalida(
  id: string,
  datos: { cantidad: number; motivo: string },
) {
  return apiPost<Repuesto>(`/repuestos/${id}/salidas`, datos);
}

export function listarMovimientos(id: string) {
  return apiGet<MovimientoInventario[]>(`/repuestos/${id}/movimientos`);
}

// ---------------------------------------------------------------------------
// Alertas (TCI-47)
// ---------------------------------------------------------------------------

export function listarAlertas() {
  return apiGet<AlertaRepuesto[]>("/repuestos/alertas");
}

// ---------------------------------------------------------------------------
// Consumo por orden (TCI-46)
// ---------------------------------------------------------------------------

export function listarConsumo(ordenId: string) {
  return apiGet<LineaConsumo[]>(`/ordenes/${ordenId}/repuestos`);
}

export function imputarRepuesto(
  ordenId: string,
  datos: { repuestoId: string; cantidad: number },
) {
  return apiPost<LineaConsumo>(`/ordenes/${ordenId}/repuestos`, datos);
}

export function corregirConsumo(
  ordenId: string,
  lineaId: string,
  cantidad: number,
) {
  return apiPatch<LineaConsumo>(`/ordenes/${ordenId}/repuestos/${lineaId}`, {
    cantidad,
  });
}

export function retirarConsumo(ordenId: string, lineaId: string) {
  return apiDelete(`/ordenes/${ordenId}/repuestos/${lineaId}`);
}

// ---------------------------------------------------------------------------
// Presentación
// ---------------------------------------------------------------------------

/**
 * Las cantidades salen de Postgres con tres decimales fijos ("5.000"), que en
 * pantalla es ruido. Se recortan los ceros de la derecha sin tocar los
 * decimales que sí significan algo: 0.750 se queda en 0.75.
 */
export function formatearCantidad(valor: Decimal): string {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return String(valor);
  return numero.toLocaleString("es-HN", { maximumFractionDigits: 3 });
}

export function formatearMoneda(valor: Decimal, moneda = "HNL"): string {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return String(valor);
  return numero.toLocaleString("es-HN", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 2,
  });
}

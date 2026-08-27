import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "./api";

/**
 * Catálogo de tipos de mantenimiento — TCI-30.
 *
 * Hay dos lecturas y no son intercambiables:
 *
 *  - `listarTiposActivos` (`GET /tipos-mantenimiento`) — lo que puede elegir
 *    quien crea una orden. Solo activos: si el formulario ofreciera uno
 *    desactivado, el backend rechazaría el alta con un 422 y el usuario no
 *    entendería por qué.
 *  - `listarTiposAdmin` (`GET /tipos-mantenimiento/admin`) — la pantalla de
 *    gestión. Trae también los desactivados y cuántas órdenes usan cada uno.
 */

/** Lo que necesita el formulario de alta de una orden. */
export interface TipoActivo {
  id: string;
  codigo: string;
  nombre: string;
  color: string | null;
  requiereEquipo: boolean;
}

export interface TipoMantenimiento extends TipoActivo {
  activo: boolean;
  createdAt: string;
  /** Cuántas órdenes lo usan. Si es > 0 no se puede borrar, solo desactivar. */
  ordenes: number;
}

export type DatosTipo = {
  codigo: string;
  nombre: string;
  color?: string;
  requiereEquipo?: boolean;
};

export function listarTiposActivos() {
  return apiGet<TipoActivo[]>("/tipos-mantenimiento");
}

export function listarTiposAdmin(
  filtros: { q?: string; activo?: boolean } = {},
) {
  const params = new URLSearchParams();
  if (filtros.q?.trim()) params.set("q", filtros.q.trim());
  if (filtros.activo !== undefined) {
    params.set("activo", String(filtros.activo));
  }
  return apiGet<TipoMantenimiento[]>("/tipos-mantenimiento/admin", params);
}

export function crearTipo(datos: DatosTipo) {
  return apiPost<TipoMantenimiento>("/tipos-mantenimiento", datos);
}

export function actualizarTipo(
  id: string,
  datos: Partial<DatosTipo> & { activo?: boolean },
) {
  return apiPatch<TipoMantenimiento>(`/tipos-mantenimiento/${id}`, datos);
}

/** Borrado real. El backend lo rechaza con 422 si alguna orden usa el tipo. */
export function eliminarTipo(id: string) {
  return apiDelete(`/tipos-mantenimiento/${id}`);
}

/** Colores sugeridos: la paleta ya usada por el seed, más el rojo de marca. */
export const COLORES_SUGERIDOS = [
  "#C61D1A",
  "#2E7D32",
  "#1565C0",
  "#EF6C00",
  "#6B7280",
];

// ---------------------------------------------------------------------------
// Listas de verificacion (plantilla por tipo)
// ---------------------------------------------------------------------------

export interface ItemPlantilla {
  id: string;
  texto: string;
  orden: number;
}

export function listarChecklistTipo(tipoId: string) {
  return apiGet<ItemPlantilla[]>(`/tipos-mantenimiento/${tipoId}/checklist`);
}

/**
 * Reemplaza la lista entera.
 *
 * Se manda completa y no item a item porque la pantalla es una lista que se
 * edita y se reordena en bloque: separarla en altas, bajas y movimientos
 * obligaria a reconciliar dos ordenes distintos por nada.
 */
export function guardarChecklistTipo(tipoId: string, items: string[]) {
  return apiPut<ItemPlantilla[]>(`/tipos-mantenimiento/${tipoId}/checklist`, {
    items,
  });
}

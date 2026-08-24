import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

/** Espejo de lo que devuelve backend/src/equipos/equipos.service.ts. */
export interface Equipo {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string | null;
  marca: string | null;
  modelo: string | null;
  numeroSerie: string | null;
  ubicacionFisica: string | null;
  activo: boolean;
  cliente: { id: string; nombre: string };
  sede: { id: string; nombre: string; ciudad: string | null } | null;
  _count: { ordenes: number };
}

export interface FiltrosEquipos {
  clienteId?: string;
  q?: string;
}

export type DatosEquipo = {
  codigo: string;
  nombre: string;
  clienteId: string;
  sedeId?: string;
  tipo?: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  ubicacionFisica?: string;
};

export function listarEquiposAdmin(filtros: FiltrosEquipos = {}) {
  const params = new URLSearchParams();
  if (filtros.clienteId) params.set("clienteId", filtros.clienteId);
  if (filtros.q?.trim()) params.set("q", filtros.q.trim());
  return apiGet<Equipo[]>("/equipos", params);
}

export function crearEquipo(datos: DatosEquipo) {
  return apiPost<Equipo>("/equipos", datos);
}

/** El cliente no se puede cambiar: el equipo pertenece a quien lo tiene. */
export function actualizarEquipo(
  id: string,
  datos: Partial<Omit<DatosEquipo, "clienteId"> & { activo: boolean }>,
) {
  return apiPatch<Equipo>(`/equipos/${id}`, datos);
}

export function eliminarEquipo(id: string) {
  return apiDelete(`/equipos/${id}`);
}

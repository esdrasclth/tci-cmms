import { apiDelete, apiGet, apiPatch, apiPost, type Pagina } from "./api";

/** Espejo de lo que devuelve backend/src/clientes/clientes.service.ts. */
export interface Sede {
  id: string;
  nombre: string;
  direccion: string | null;
  ciudad: string | null;
  referenciaGeo: string | null;
  activo: boolean;
}

export interface Cliente {
  id: string;
  nombre: string;
  rtn: string | null;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  activo: boolean;
  sedes: Sede[];
  _count: { ordenes: number; equipos: number };
}

export type DatosCliente = {
  nombre: string;
  rtn?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
};

export function listarClientesAdmin(
  filtros: {
    q?: string;
    activo?: boolean;
    page?: number;
    perPage?: number;
  } = {},
) {
  const params = new URLSearchParams();
  if (filtros.q?.trim()) params.set("q", filtros.q.trim());
  if (filtros.activo !== undefined)
    params.set("activo", String(filtros.activo));
  if (filtros.page) params.set("page", String(filtros.page));
  if (filtros.perPage) params.set("perPage", String(filtros.perPage));
  return apiGet<Pagina<Cliente>>("/clientes", params);
}

export function crearCliente(datos: DatosCliente) {
  return apiPost<Cliente>("/clientes", datos);
}

export function actualizarCliente(
  id: string,
  datos: Partial<DatosCliente & { activo: boolean }>,
) {
  return apiPatch<Cliente>(`/clientes/${id}`, datos);
}

export function eliminarCliente(id: string) {
  return apiDelete(`/clientes/${id}`);
}

export type DatosSede = {
  nombre: string;
  direccion?: string;
  ciudad?: string;
  referenciaGeo?: string;
};

export function crearSede(clienteId: string, datos: DatosSede) {
  return apiPost<Sede>(`/clientes/${clienteId}/sedes`, datos);
}

export function actualizarSede(
  id: string,
  datos: Partial<DatosSede & { activo: boolean }>,
) {
  return apiPatch<Sede>(`/sedes/${id}`, datos);
}

export function eliminarSede(id: string) {
  return apiDelete(`/sedes/${id}`);
}

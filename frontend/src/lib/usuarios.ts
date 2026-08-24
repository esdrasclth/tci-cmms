import { apiGet, apiPatch, apiPost } from "./api";

/** Espejo de CAMPOS_PUBLICOS en backend/src/usuarios/usuarios.service.ts. */
export interface Usuario {
  id: string;
  name: string;
  email: string;
  rol: "ADMIN" | "TECNICO";
  activo: boolean;
  telefono: string | null;
  createdAt: string;
}

export interface FiltrosUsuarios {
  rol?: "ADMIN" | "TECNICO";
  activo?: boolean;
  q?: string;
}

export function listarUsuarios(filtros: FiltrosUsuarios = {}) {
  const params = new URLSearchParams();
  if (filtros.rol) params.set("rol", filtros.rol);
  if (filtros.activo !== undefined) params.set("activo", String(filtros.activo));
  if (filtros.q?.trim()) params.set("q", filtros.q.trim());
  return apiGet<Usuario[]>("/usuarios", params);
}

export function crearUsuario(datos: {
  name: string;
  email: string;
  password: string;
  rol: "ADMIN" | "TECNICO";
  telefono?: string;
}) {
  return apiPost<Usuario>("/usuarios", datos);
}

export function actualizarUsuario(
  id: string,
  datos: Partial<Pick<Usuario, "name" | "rol" | "activo"> & { telefono: string }>,
) {
  return apiPatch<Usuario>(`/usuarios/${id}`, datos);
}

export function reiniciarContrasena(id: string, password: string) {
  return apiPost<{ ok: true }>(`/usuarios/${id}/contrasena`, { password });
}

export const ETIQUETA_ROL = { ADMIN: "Administrador", TECNICO: "Tecnico" };

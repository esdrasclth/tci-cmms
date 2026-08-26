import { apiGet, apiPatch, apiPost } from "./api";

/**
 * Módulo 8 — notificaciones (TCI-53 a TCI-56).
 *
 * La bandeja es la de la sesión: el backend saca el usuario de la cookie y no
 * acepta un `usuarioId` por parámetro, así que aquí no hay nada que pasarle.
 */

export type EventoNotificable =
  | "ORDEN_ASIGNADA"
  | "ORDEN_COMPLETADA"
  | "ORDEN_CANCELADA"
  | "ORDEN_REABIERTA"
  | "ORDEN_COMENTADA"
  | "PREVENTIVO_POR_VENCER"
  | "REPUESTO_BAJO_MINIMO";

export type CanalNotificacion = "EN_APP" | "CORREO";

export interface Notificacion {
  id: string;
  evento: EventoNotificable;
  titulo: string;
  cuerpo: string;
  /** Ruta relativa de la aplicación a la que lleva. */
  enlace: string | null;
  leidaEn: string | null;
  createdAt: string;
}

export interface Bandeja {
  data: Notificacion[];
  /** Sobre toda la bandeja, no sobre la página: es el número del badge. */
  noLeidas: number;
  meta: { total: number; page: number; perPage: number; totalPages: number };
}

export interface Preferencia {
  id: string;
  evento: EventoNotificable;
  rol: "ADMIN" | "TECNICO";
  canal: CanalNotificacion;
  activo: boolean;
}

export interface Plantilla {
  id: string;
  evento: EventoNotificable;
  asunto: string;
  cuerpo: string;
  updatedAt: string;
}

export function obtenerBandeja(
  opciones: { soloNoLeidas?: boolean; page?: number; perPage?: number } = {},
) {
  const params = new URLSearchParams();
  if (opciones.soloNoLeidas) params.set("soloNoLeidas", "true");
  if (opciones.page) params.set("page", String(opciones.page));
  if (opciones.perPage) params.set("perPage", String(opciones.perPage));
  return apiGet<Bandeja>("/notificaciones", params);
}

export function marcarLeida(id: string) {
  return apiPatch<{ id: string; leidaEn: string }>(
    `/notificaciones/${id}/leida`,
    {},
  );
}

export function marcarTodasLeidas() {
  return apiPost<{ marcadas: number }>("/notificaciones/leidas", {});
}

export function listarPreferencias() {
  return apiGet<Preferencia[]>("/notificaciones/preferencias");
}

export function cambiarPreferencia(id: string, activo: boolean) {
  return apiPatch<Preferencia>(`/notificaciones/preferencias/${id}`, { activo });
}

export function listarPlantillas() {
  return apiGet<Plantilla[]>("/notificaciones/plantillas");
}

export function cambiarPlantilla(
  id: string,
  datos: { asunto?: string; cuerpo?: string },
) {
  return apiPatch<Plantilla>(`/notificaciones/plantillas/${id}`, datos);
}

// ---------------------------------------------------------------------------
// Presentación
// ---------------------------------------------------------------------------

export const ETIQUETA_EVENTO: Record<EventoNotificable, string> = {
  ORDEN_ASIGNADA: "Orden asignada",
  ORDEN_COMPLETADA: "Orden completada",
  ORDEN_CANCELADA: "Orden cancelada",
  ORDEN_REABIERTA: "Orden reabierta",
  ORDEN_COMENTADA: "Comentario nuevo",
  PREVENTIVO_POR_VENCER: "Preventivo por vencer",
  REPUESTO_BAJO_MINIMO: "Repuesto bajo mínimo",
};

export const ETIQUETA_CANAL: Record<CanalNotificacion, string> = {
  EN_APP: "En la aplicación",
  CORREO: "Correo",
};

/** Los marcadores que admite cada plantilla, para enseñárselos a quien edita. */
export const MARCADORES: Record<EventoNotificable, string[]> = {
  ORDEN_ASIGNADA: ["numero", "titulo", "cliente", "equipo"],
  ORDEN_COMPLETADA: ["numero", "titulo", "cliente", "tecnico"],
  ORDEN_CANCELADA: ["numero", "titulo", "cliente", "motivo"],
  ORDEN_REABIERTA: ["numero", "titulo", "cliente"],
  ORDEN_COMENTADA: ["numero", "titulo", "autor", "comentario"],
  PREVENTIVO_POR_VENCER: ["equipo", "cliente", "plan", "cuando"],
  REPUESTO_BAJO_MINIMO: ["repuesto", "existencia", "unidad", "minimo"],
};

/** "hace 5 min", "hace 2 h", "hace 3 días". */
export function haceCuanto(iso: string): string {
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return "ahora mismo";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return "ayer";
  if (dias < 30) return `hace ${dias} días`;
  return new Date(iso).toLocaleDateString("es-HN", {
    day: "numeric",
    month: "short",
  });
}

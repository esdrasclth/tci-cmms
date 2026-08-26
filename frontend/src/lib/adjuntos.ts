import { ApiError, API } from "./api";

/**
 * Evidencia adjunta a una orden — TCI-43.
 *
 * El bucket de MinIO es privado: el archivo entra y sale por la API, que es
 * donde se comprueba si quien pregunta es el admin o el tecnico asignado.
 *
 * Por eso las imagenes NO se pueden pintar con `<img src={urlDeLaApi}>`: la
 * cookie de sesion es SameSite=Lax y el navegador no la manda en una peticion
 * de subrecurso hacia otro origen (el front esta en :3000 y la API en :3001).
 * La foto se baja con `fetch` y `credentials: "include"`, y se muestra desde un
 * object URL. Ver `descargarAdjunto`.
 */

export const TIPOS_ADJUNTO = [
  "EVIDENCIA_ANTES",
  "EVIDENCIA_DESPUES",
  "DOCUMENTO",
] as const;

export type TipoAdjunto = (typeof TIPOS_ADJUNTO)[number];

export const ETIQUETA_ADJUNTO: Record<TipoAdjunto, string> = {
  EVIDENCIA_ANTES: "Antes",
  EVIDENCIA_DESPUES: "Despues",
  DOCUMENTO: "Documento",
};

export interface Adjunto {
  id: string;
  ordenId: string;
  nombreArchivo: string;
  mimeType: string;
  tamanoBytes: number;
  tipo: TipoAdjunto;
  createdAt: string;
  usuario: { id: string; name: string };
}

/** Debe coincidir con FORMATOS en backend/src/adjuntos/tipos-permitidos.ts. */
export const MIMES_ACEPTADOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const ACCEPT = MIMES_ACEPTADOS.join(",");

/** Espeja ADJUNTOS_MAX_BYTES del backend (10 MB por defecto). */
export const MAX_BYTES = 10 * 1024 * 1024;

export function esImagen(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Llamadas
// ---------------------------------------------------------------------------

export async function subirAdjunto(
  ordenId: string,
  archivo: File,
  tipo: TipoAdjunto,
): Promise<Adjunto> {
  const datos = new FormData();
  datos.append("archivo", archivo, archivo.name);
  datos.append("tipo", tipo);

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API}/api/ordenes/${ordenId}/adjuntos`, {
      method: "POST",
      credentials: "include",
      // Sin Content-Type a proposito: lo pone el navegador con el `boundary`
      // del multipart, que no se puede escribir a mano.
      headers: { Accept: "application/json" },
      body: datos,
    });
  } catch {
    throw new ApiError(
      0,
      "No se pudo conectar con el servidor. Verifique su conexion.",
    );
  }

  if (!respuesta.ok) {
    const detalle: unknown = await respuesta.json().catch(() => null);
    throw new ApiError(respuesta.status, mensaje(detalle, respuesta.status));
  }

  return (await respuesta.json()) as Adjunto;
}

export async function eliminarAdjunto(
  ordenId: string,
  adjuntoId: string,
): Promise<void> {
  const respuesta = await fetch(
    `${API}/api/ordenes/${ordenId}/adjuntos/${adjuntoId}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: { Accept: "application/json" },
    },
  );

  if (!respuesta.ok) {
    const detalle: unknown = await respuesta.json().catch(() => null);
    throw new ApiError(respuesta.status, mensaje(detalle, respuesta.status));
  }
}

/**
 * Baja el archivo como Blob.
 *
 * Quien lo llame es responsable de liberar el object URL que cree a partir de
 * el (`URL.revokeObjectURL`), o la pestana va acumulando la memoria de cada
 * foto que se abrio.
 */
export async function descargarAdjunto(
  ordenId: string,
  adjuntoId: string,
): Promise<Blob> {
  const respuesta = await fetch(
    `${API}/api/ordenes/${ordenId}/adjuntos/${adjuntoId}`,
    { credentials: "include" },
  );

  if (!respuesta.ok) {
    throw new ApiError(respuesta.status, mensaje(null, respuesta.status));
  }

  return respuesta.blob();
}

function mensaje(detalle: unknown, status: number): string {
  if (typeof detalle === "object" && detalle !== null) {
    const texto = (detalle as { message?: unknown }).message;
    if (typeof texto === "string") return texto;
    if (Array.isArray(texto) && typeof texto[0] === "string") {
      return texto.join(". ");
    }
  }

  if (status === 413) {
    return `El archivo es demasiado grande. El maximo son ${MAX_BYTES / 1024 / 1024} MB.`;
  }
  if (status === 401) return "Su sesion expiro. Vuelva a iniciar sesion.";
  if (status === 403) return "No tiene permiso para esta operacion.";
  return "No se pudo completar la operacion con el archivo.";
}

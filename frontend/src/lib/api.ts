const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * GET contra la API de NestJS.
 *
 * `credentials: 'include'` es obligatorio: el backend vive en otro origen y sin
 * esto la cookie de sesion no viaja y todo responde 401.
 */
export async function apiGet<T>(
  ruta: string,
  params?: URLSearchParams,
): Promise<T> {
  const query = params && [...params.keys()].length > 0 ? `?${params}` : "";

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API}/api${ruta}${query}`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new ApiError(
      0,
      "No se pudo conectar con el servidor. Verifique que la API este arriba.",
    );
  }

  if (!respuesta.ok) {
    throw new ApiError(respuesta.status, mensajeDeError(respuesta.status));
  }

  return (await respuesta.json()) as T;
}

/**
 * POST contra la API.
 *
 * A diferencia del GET, aqui si interesa el mensaje que manda el backend: las
 * reglas de la maquina de estados (422) y de permisos (403) explican al usuario
 * por que no se pudo hacer la accion, y traducirlas de nuevo aqui las duplicaria.
 */
export async function apiPost<T>(ruta: string, cuerpo: unknown): Promise<T> {
  return enviar<T>("POST", ruta, cuerpo);
}

async function enviar<T>(
  metodo: "POST" | "PATCH",
  ruta: string,
  cuerpo: unknown,
): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${API}/api${ruta}`, {
      method: metodo,
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(cuerpo),
    });
  } catch {
    throw new ApiError(
      0,
      "No se pudo conectar con el servidor. Verifique que la API este arriba.",
    );
  }

  if (!respuesta.ok) {
    const detalle = await respuesta.json().catch(() => null);
    throw new ApiError(
      respuesta.status,
      mensajeDelBackend(detalle) ?? mensajeDeError(respuesta.status),
    );
  }

  return (await respuesta.json()) as T;
}

/** PATCH. Mismo tratamiento de errores que el POST. */
export async function apiPatch<T>(ruta: string, cuerpo: unknown): Promise<T> {
  return enviar<T>("PATCH", ruta, cuerpo);
}

/** Nest devuelve `message` como texto o como lista (errores de validacion). */
function mensajeDelBackend(detalle: unknown): string | null {
  if (typeof detalle !== "object" || detalle === null) return null;
  const mensaje = (detalle as { message?: unknown }).message;
  if (typeof mensaje === "string") return mensaje;
  if (Array.isArray(mensaje) && typeof mensaje[0] === "string") {
    return mensaje.join(". ");
  }
  return null;
}

function mensajeDeError(status: number): string {
  switch (status) {
    case 401:
      return "Su sesion expiro. Vuelva a iniciar sesion.";
    case 403:
      return "No tiene permiso para ver esta informacion.";
    case 404:
      return "No se encontro lo que busca.";
    default:
      return "Ocurrio un error al consultar la API.";
  }
}

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

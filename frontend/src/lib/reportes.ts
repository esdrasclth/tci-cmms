import { API, ApiError, apiGet } from "./api";
import type { Estado, Prioridad } from "./ordenes";

/**
 * Módulo 9 — reportes e historial (TCI-57, TCI-58, TCI-59, TCI-60).
 *
 * Los `Decimal` de Postgres llegan como `string`, igual que en órdenes y
 * repuestos. Se convierten donde hay que calcular o formatear, nunca antes.
 */

export type Decimal = string | number;

/** TCI-60 — tablero. */
export interface ResumenReportes {
  periodo: { desde: string | null; hasta: string | null };
  total: number;
  abiertas: number;
  porEstado: Partial<Record<Estado, number>>;
  porPrioridad: Partial<Record<Prioridad, number>>;
  porTipo: { id: string; nombre: string; color: string | null; ordenes: number }[];
  horasTotales: Decimal | null;
  costos: { manoObra: Decimal; repuestos: Decimal; total: Decimal };
  /** Media de días entre el alta y el cierre. `null` si no hay cerradas. */
  diasPromedioResolucion: number | null;
}

/** TCI-58 — carga y desempeño por técnico. */
export interface FilaTecnico {
  id: string;
  nombre: string;
  correo: string;
  total: number;
  completadas: number;
  abiertas: number;
  canceladas: number;
  horas: Decimal;
  costoTotal: Decimal;
  diasPromedioResolucion: number | null;
}

export interface ReporteTecnicos {
  periodo: { desde: string | null; hasta: string | null };
  tecnicos: FilaTecnico[];
}

/** TCI-57 — historial consolidado de un equipo. */
export interface OrdenDelHistorial {
  id: string;
  numero: string;
  titulo: string;
  estado: Estado;
  prioridad: Prioridad;
  trabajoRealizado: string | null;
  fechaProgramada: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  horasTrabajadas: Decimal | null;
  createdAt: string;
  tipoMantenimiento: {
    id: string;
    codigo: string;
    nombre: string;
    color: string | null;
  };
  tecnico: { id: string; name: string } | null;
}

export interface HistorialEquipo {
  equipo: {
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
  };
  resumen: {
    total: number;
    porEstado: Partial<Record<Estado, number>>;
    horasTotales: Decimal | null;
    primeraIntervencion: string | null;
    ultimaIntervencion: string | null;
    diasPromedioResolucion: number | null;
  };
  ordenes: OrdenDelHistorial[];
  /** Hay más de las que vienen: para el resto se va al listado general. */
  truncado: boolean;
}

export type Periodo = {
  desde?: string;
  hasta?: string;
  clienteId?: string;
  tecnicoId?: string;
};

function parametros(periodo: Periodo): URLSearchParams {
  const params = new URLSearchParams();
  if (periodo.desde) params.set("desde", periodo.desde);
  if (periodo.hasta) params.set("hasta", periodo.hasta);
  if (periodo.clienteId) params.set("clienteId", periodo.clienteId);
  if (periodo.tecnicoId) params.set("tecnicoId", periodo.tecnicoId);
  return params;
}

export function obtenerHistorialEquipo(equipoId: string) {
  return apiGet<HistorialEquipo>(`/equipos/${equipoId}/historial`);
}

export function obtenerResumen(periodo: Periodo = {}) {
  return apiGet<ResumenReportes>("/reportes/resumen", parametros(periodo));
}

export function obtenerReporteTecnicos(periodo: Periodo = {}) {
  return apiGet<ReporteTecnicos>("/reportes/tecnicos", parametros(periodo));
}

/**
 * TCI-59 — descarga del reporte.
 *
 * No pasa por `apiGet` porque la respuesta es un archivo, no JSON: se pide como
 * blob y se entrega al navegador con un enlace temporal. `credentials:'include'`
 * sigue siendo obligatorio, como en toda la API (otro origen).
 */
export async function descargarReporte(
  formato: "csv" | "pdf",
  periodo: Periodo = {},
): Promise<void> {
  const params = parametros(periodo);
  params.set("formato", formato);

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API}/api/reportes/ordenes?${params}`, {
      credentials: "include",
    });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor.");
  }

  if (!respuesta.ok) {
    throw new ApiError(
      respuesta.status,
      respuesta.status === 403
        ? "No tiene permiso para exportar reportes."
        : "No se pudo generar el archivo.",
    );
  }

  const blob = await respuesta.blob();
  const nombre =
    respuesta.headers
      .get("Content-Disposition")
      ?.match(/filename="([^"]+)"/)?.[1] ?? `ordenes-tci.${formato}`;

  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // Sin esto el blob queda retenido en memoria mientras viva la pestaña.
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Presentación
// ---------------------------------------------------------------------------

export function formatearNumero(valor: Decimal | null, decimales = 0): string {
  if (valor === null) return "—";
  const numero = Number(valor);
  if (Number.isNaN(numero)) return "—";
  return numero.toLocaleString("es-HN", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

export function formatearLempiras(valor: Decimal | null): string {
  if (valor === null) return "—";
  const numero = Number(valor);
  if (Number.isNaN(numero)) return "—";
  return numero.toLocaleString("es-HN", {
    style: "currency",
    currency: "HNL",
    maximumFractionDigits: 0,
  });
}

/**
 * Tiempo de resolución con la unidad que corresponda.
 *
 * El backend lo devuelve siempre en días porque es la unidad que tiene sentido
 * para el negocio, pero una orden que se abre y se cierra en la misma visita da
 * 0.01, y escribir "0.0 días" se lee como instantáneo cuando en realidad son
 * quince minutos. Por debajo del día se baja a horas, y por debajo de la hora a
 * minutos.
 */
export function formatearDuracion(dias: number | null): string {
  if (dias === null) return "—";

  const horas = dias * 24;
  if (horas < 1) {
    return `${Math.round(horas * 60)} min`;
  }
  if (dias < 1) {
    return `${horas.toLocaleString("es-HN", { maximumFractionDigits: 1 })} h`;
  }
  const texto = dias.toLocaleString("es-HN", { maximumFractionDigits: 1 });
  return `${texto} ${dias === 1 ? "día" : "días"}`;
}

/** El primer y el último día del mes en curso, en formato `YYYY-MM-DD`. */
export function mesActual(): { desde: string; hasta: string } {
  const hoy = new Date();
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  return {
    desde: iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
    hasta: iso(hoy),
  };
}

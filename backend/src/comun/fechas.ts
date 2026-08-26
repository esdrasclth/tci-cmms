/**
 * Limites de dia en hora del negocio.
 *
 * Compartido por los reportes (TCI-58) y el calendario preventivo (TCI-51),
 * que reciben las fechas como `YYYY-MM-DD` y tienen que convertirlas en un
 * instante. No se usa la zona del servidor: en un contenedor suele ser UTC, y
 * entonces "hasta el 31 de agosto" dejaria fuera todo lo que ocurrio despues de
 * las 18:00 del 31 en Honduras.
 */

/**
 * Desfase horario del negocio, en horas respecto a UTC.
 *
 * Honduras es UTC-6 todo el ano: no aplica horario de verano desde 2006. Se
 * deja configurable por si el sistema se despliega para otra operacion.
 */
export const HORAS_UTC = Number(process.env.REPORTES_UTC_OFFSET ?? -6);

/** 00:00:00.000 del dia indicado, en hora del negocio. */
export function inicioDelDia(fecha: string): Date {
  return limiteDelDia(fecha, 0, 0, 0, 0);
}

/**
 * 23:59:59.999 del dia indicado, en hora del negocio. Quien escribe "hasta el
 * 31" espera que el 31 entre entero.
 */
export function finDelDia(fecha: string): Date {
  return limiteDelDia(fecha, 23, 59, 59, 999);
}

function limiteDelDia(
  fecha: string,
  hora: number,
  minuto: number,
  segundo: number,
  ms: number,
): Date {
  const [ano, mes, dia] = fecha.slice(0, 10).split('-').map(Number);
  // Se compone en UTC y se corrige el desfase, en vez de usar `setHours`, que
  // aplicaria la zona del servidor y no la del negocio.
  return new Date(
    Date.UTC(ano, mes - 1, dia, hora - HORAS_UTC, minuto, segundo, ms),
  );
}

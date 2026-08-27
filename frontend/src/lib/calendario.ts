/**
 * Rejilla de un mes, compartida por los dos calendarios.
 *
 * Vivia dentro de `calendario-preventivo.tsx`, que era el unico que la tenia.
 * Al aparecer el calendario de ordenes, copiarla habria sido la forma mas
 * rapida de que dentro de seis meses las dos semanas empezaran en dias
 * distintos.
 */

/** Lunes primero: es como se lee una semana laboral en Honduras. */
export const DIAS_SEMANA = [
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
  "Dom",
] as const;

/**
 * Clave `YYYY-MM-DD` en hora local.
 *
 * No se usa `toISOString()`: ese convierte a UTC, y en Honduras —UTC−6— todo
 * lo que ocurra despues de las 18:00 saltaria al dia siguiente.
 */
export function claveDia(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(
    fecha.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * Las celdas del mes, incluyendo los dias de relleno de las semanas de los
 * extremos. Cinco semanas en la mayoria de meses; la sexta solo si hace falta.
 */
export function celdasDelMes(mes: Date): { fecha: Date; delMes: boolean }[] {
  const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
  // getDay() da 0 para domingo; se rota para que lunes sea 0.
  const desplazamiento = (primero.getDay() + 6) % 7;

  const inicio = new Date(primero);
  inicio.setDate(primero.getDate() - desplazamiento);

  const celdas: { fecha: Date; delMes: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const fecha = new Date(inicio);
    fecha.setDate(inicio.getDate() + i);
    celdas.push({ fecha, delMes: fecha.getMonth() === mes.getMonth() });
    if (i >= 34 && fecha.getMonth() !== mes.getMonth() && (i + 1) % 7 === 0) {
      break;
    }
  }
  return celdas;
}

/** Primer y ultimo instante de la rejilla, para pedir al servidor solo eso. */
export function rangoDeLaRejilla(mes: Date): { desde: string; hasta: string } {
  const celdas = celdasDelMes(mes);
  const primera = celdas[0].fecha;
  const ultima = celdas[celdas.length - 1].fecha;
  return {
    desde: new Date(
      primera.getFullYear(),
      primera.getMonth(),
      primera.getDate(),
      0,
      0,
      0,
    ).toISOString(),
    hasta: new Date(
      ultima.getFullYear(),
      ultima.getMonth(),
      ultima.getDate(),
      23,
      59,
      59,
    ).toISOString(),
  };
}

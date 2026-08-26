/**
 * Construye la cabecera `Content-Disposition` de un adjunto — TCI-43.
 *
 * Las cabeceras HTTP solo admiten ASCII, y los tecnicos suben fotos con nombres
 * como `Compresión final.png`. Meter ese nombre tal cual rompe la peticion: al
 * subir, MinIO la rechaza con un 400; al descargar, el cliente HTTP se atraganta
 * con el byte alto.
 *
 * La solucion es la de RFC 5987: un `filename` en ASCII como respaldo para
 * clientes viejos, y un `filename*` con el nombre real codificado en UTF-8, que
 * es el que usan los navegadores actuales.
 */
export function cabeceraDisposicion(
  nombreArchivo: string,
  enLinea: boolean,
): string {
  const tipo = enLinea ? 'inline' : 'attachment';
  return `${tipo}; filename="${respaldoAscii(nombreArchivo)}"; filename*=UTF-8''${encodeURIComponent(nombreArchivo)}`;
}

/**
 * Nombre reducido a ASCII imprimible. Las comillas y la barra invertida se
 * quitan del todo porque romperian el entrecomillado de la cabecera.
 */
function respaldoAscii(nombreArchivo: string): string {
  const limpio = nombreArchivo
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/["\\]/g, '')
    .replace(/[^\x20-\x7e]/g, '_')
    .trim();

  return limpio || 'archivo';
}

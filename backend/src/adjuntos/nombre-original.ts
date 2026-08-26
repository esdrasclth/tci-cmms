/** Caracter de reemplazo que Node inserta donde los bytes no eran UTF-8. */
const REEMPLAZO = String.fromCharCode(0xfffd);

/**
 * Recupera el nombre real del archivo subido — TCI-43.
 *
 * multipart/form-data no lleva la codificacion del nombre, y busboy (debajo de
 * multer) lo decodifica como latin1. Los navegadores lo mandan en UTF-8, asi
 * que `Compresión final.png` llega como `CompresiÃ³n final.png`.
 *
 * Importa: en TCI los tecnicos nombran las fotos en espanol, y ese nombre es lo
 * que se guarda en la base y lo que ve el admin al revisar el cierre.
 *
 * Se reinterpretan los bytes como UTF-8 y, si el resultado no es UTF-8 valido,
 * se deja el nombre como vino: preferible un nombre raro a uno destrozado.
 */
export function nombreOriginal(nombreSegunMulter: string): string {
  const comoUtf8 = Buffer.from(nombreSegunMulter, 'latin1').toString('utf8');
  return comoUtf8.includes(REEMPLAZO) ? nombreSegunMulter : comoUtf8;
}

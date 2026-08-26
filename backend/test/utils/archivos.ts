/**
 * Archivos de prueba para los e2e de adjuntos (TCI-43).
 *
 * El backend no decodifica las imagenes: solo mira los primeros bytes para
 * saber si el formato esta permitido (`src/adjuntos/tipos-permitidos.ts`). Por
 * eso basta con reproducir la firma de cada formato, salvo en el PNG, que es
 * uno real de 1x1 para comprobar que el archivo vuelve byte a byte igual.
 */

/** PNG valido de 1x1 px, transparente. */
export const PNG_REAL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/** Firma JPEG (FF D8 FF) seguida de relleno. */
export function jpegDePrueba(bytesDeRelleno = 512): Buffer {
  return Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    Buffer.alloc(bytesDeRelleno, 0x42),
    Buffer.from([0xff, 0xd9]),
  ]);
}

/** Contenedor RIFF/WEBP: 'RIFF', 4 bytes de tamano y 'WEBP'. */
export function webpDePrueba(): Buffer {
  return Buffer.concat([
    Buffer.from('RIFF', 'ascii'),
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
    Buffer.from('WEBP', 'ascii'),
    Buffer.alloc(64, 0x00),
  ]);
}

export function pdfDePrueba(): Buffer {
  return Buffer.from('%PDF-1.4\n% documento de prueba\n%%EOF\n', 'ascii');
}

/**
 * El caso que justifica mirar los bytes: un HTML con `Content-Type: image/png`.
 * Si se guardara y luego se sirviera en linea desde el origen de la API, seria
 * un XSS almacenado.
 */
export function htmlDisfrazadoDeImagen(): Buffer {
  return Buffer.from('<html><script>alert(1)</script></html>', 'utf8');
}

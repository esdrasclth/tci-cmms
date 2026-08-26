/**
 * Formatos que se aceptan como adjunto — TCI-43.
 *
 * La lista es corta a proposito. El backend sirve estos archivos de vuelta
 * desde su propio origen, asi que aceptar cualquier cosa seria abrir un XSS
 * almacenado: basta con subir un HTML y pasarle el enlace a alguien con sesion.
 *
 * Por eso no se confia en el `Content-Type` que declara el navegador y se
 * comprueban ademas los primeros bytes del archivo. Un `.html` renombrado a
 * `.jpg` no pasa esa comprobacion.
 */

export interface FormatoPermitido {
  mimeType: string;
  extensiones: string[];
  /** Primeros bytes que identifican el formato. */
  firma: number[];
  /** Desplazamiento donde empieza la firma. */
  desde?: number;
  /**
   * Los PDF se descargan en vez de abrirse en la pestana: un visor de PDF
   * puede ejecutar JavaScript embebido, y no vale la pena el riesgo por la
   * comodidad de verlo sin descargar. Las imagenes si van inline.
   */
  enLinea: boolean;
}

export const FORMATOS: FormatoPermitido[] = [
  {
    mimeType: 'image/jpeg',
    extensiones: ['jpg', 'jpeg'],
    firma: [0xff, 0xd8, 0xff],
    enLinea: true,
  },
  {
    mimeType: 'image/png',
    extensiones: ['png'],
    firma: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    enLinea: true,
  },
  {
    // WEBP es un contenedor RIFF: 'RIFF', 4 bytes de tamano, y luego 'WEBP'.
    mimeType: 'image/webp',
    extensiones: ['webp'],
    firma: [0x57, 0x45, 0x42, 0x50],
    desde: 8,
    enLinea: true,
  },
  {
    mimeType: 'application/pdf',
    extensiones: ['pdf'],
    firma: [0x25, 0x50, 0x44, 0x46], // %PDF
    enLinea: false,
  },
];

export const MIMES_PERMITIDOS = FORMATOS.map((f) => f.mimeType);

/**
 * Identifica el formato real por sus bytes iniciales.
 *
 * Devuelve `null` si el contenido no coincide con ningun formato permitido,
 * diga lo que diga el `Content-Type` de la peticion.
 */
export function detectarFormato(contenido: Buffer): FormatoPermitido | null {
  return (
    FORMATOS.find((formato) => {
      const desde = formato.desde ?? 0;
      if (contenido.length < desde + formato.firma.length) return false;
      return formato.firma.every(
        (byte, indice) => contenido[desde + indice] === byte,
      );
    }) ?? null
  );
}

export function formatoDe(mimeType: string): FormatoPermitido | null {
  return FORMATOS.find((f) => f.mimeType === mimeType) ?? null;
}

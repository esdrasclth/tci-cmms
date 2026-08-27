import { TipoAdjunto } from '../generated/prisma/enums';

/**
 * Construccion de la clave con la que se guarda un adjunto en MinIO — TCI-43.
 *
 * El bucket se navega a mano desde la consola de MinIO cuando algo va mal, asi
 * que la clave tiene que decir por si sola de que orden es el archivo. El
 * formato es jerarquico y ordenable:
 *
 *   ordenes/2026/OT-2026-0007/evidencia-antes/kx8s2m1a-compresor.jpg
 *
 * El anio va delante para que un listado por prefijo no tenga que recorrer todo
 * el bucket cuando el sistema lleve varios anios de ordenes. Se usa el `numero`
 * de la orden y no su `id`, porque `OT-2026-0007` es lo que la gente busca; el
 * cuid no le dice nada a nadie.
 *
 * Modulo puro a proposito: no toca MinIO ni la base, y por eso se puede probar
 * sin levantar nada.
 */

const CARPETAS: Record<TipoAdjunto, string> = {
  EVIDENCIA_ANTES: 'evidencia-antes',
  EVIDENCIA_DESPUES: 'evidencia-despues',
  DOCUMENTO: 'documentos',
  FIRMA: 'firmas',
};

/** Longitud maxima del nombre saneado, sin contar la extension. */
const MAX_NOMBRE = 60;

export function construirClave(entrada: {
  numeroOrden: string;
  tipo: TipoAdjunto;
  /** Identificador ya generado para el adjunto: evita colisiones de nombre. */
  idAdjunto: string;
  nombreArchivo: string;
}): string {
  const anio = anioDeLaOrden(entrada.numeroOrden);
  const carpeta = CARPETAS[entrada.tipo];
  const nombre = sanearNombre(entrada.nombreArchivo);

  return `ordenes/${anio}/${entrada.numeroOrden}/${carpeta}/${entrada.idAdjunto}-${nombre}`;
}

/**
 * El numero de orden es `OT-{anio}-{NNNN}` (regla 1 de
 * docs/modelo-datos-orden.md). Si algun dia deja de serlo, se cae a `sin-anio`
 * en vez de romper la subida: perder el orden del bucket es preferible a
 * perder la evidencia.
 */
function anioDeLaOrden(numero: string): string {
  return /^OT-(\d{4})-/.exec(numero)?.[1] ?? 'sin-anio';
}

/**
 * Deja el nombre en algo seguro como clave de S3: sin acentos, sin espacios y
 * sin caracteres que obliguen a escapar la URL. Conserva la extension, que es
 * lo que hace que el archivo se abra bien al descargarlo de la consola.
 */
export function sanearNombre(nombreArchivo: string): string {
  const limpio = nombreArchivo
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // marcas de acento que separa el NFD
    .toLowerCase();

  const punto = limpio.lastIndexOf('.');
  const tieneExtension = punto > 0 && punto < limpio.length - 1;

  const base = tieneExtension ? limpio.slice(0, punto) : limpio;
  const extension = tieneExtension ? limpio.slice(punto + 1) : '';

  const baseSegura = recortar(base, MAX_NOMBRE) || 'archivo';
  const extensionSegura = recortar(extension, 10);

  return extensionSegura ? `${baseSegura}.${extensionSegura}` : baseSegura;
}

function recortar(texto: string, maximo: number): string {
  return texto
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maximo)
    .replace(/-+$/g, '');
}

/**
 * Reduce una foto antes de subirla — TCI-43.
 *
 * Los tecnicos trabajan en campo, desde el telefono y con datos moviles. Una
 * camara actual saca fotos de 4 a 8 MB que, para documentar una orden, no
 * aportan nada frente a una de 1600 px: se ven igual en pantalla y suben en una
 * fraccion del tiempo. Tambien evita chocar contra el tope de 10 MB del backend.
 *
 * Solo toca imagenes rasterizadas. Los PDF pasan intactos, y si algo falla
 * (canvas bloqueado, formato que el navegador no decodifica) se devuelve el
 * archivo original: subir la foto grande es mejor que no subir nada.
 */

/** Lado mayor, en pixeles. Suficiente para leer una placa o un manometro. */
const LADO_MAXIMO = 1600;

/** Calidad del JPEG resultante. 0.82 es el punto donde deja de notarse. */
const CALIDAD = 0.82;

/** Por debajo de esto no vale la pena recomprimir. */
const MINIMO_PARA_REDUCIR = 600 * 1024;

export async function reducirImagen(archivo: File): Promise<File> {
  if (!archivo.type.startsWith("image/")) return archivo;
  if (archivo.size <= MINIMO_PARA_REDUCIR) return archivo;

  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(
      1,
      LADO_MAXIMO / Math.max(bitmap.width, bitmap.height),
    );

    // Ya es pequena: recomprimir solo la degradaria.
    if (escala === 1 && archivo.size <= MINIMO_PARA_REDUCIR) {
      bitmap.close();
      return archivo;
    }

    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(bitmap.width * escala);
    lienzo.height = Math.round(bitmap.height * escala);

    const contexto = lienzo.getContext("2d");
    if (!contexto) {
      bitmap.close();
      return archivo;
    }

    contexto.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolver) => {
      lienzo.toBlob(resolver, "image/jpeg", CALIDAD);
    });

    // Si el resultado no es mas chico, el original ya estaba bien comprimido.
    if (!blob || blob.size >= archivo.size) return archivo;

    return new File([blob], renombrarAJpg(archivo.name), {
      type: "image/jpeg",
      lastModified: archivo.lastModified,
    });
  } catch {
    return archivo;
  }
}

/** El contenido pasa a ser JPEG, asi que la extension tiene que acompanar. */
function renombrarAJpg(nombre: string): string {
  return `${nombre.replace(/\.[^.]+$/, "")}.jpg`;
}

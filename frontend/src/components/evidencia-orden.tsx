"use client";

import { useEffect, useRef, useState } from "react";

import { Alerta } from "@/components/form";
import {
  ACCEPT,
  ETIQUETA_ADJUNTO,
  TIPOS_ADJUNTO,
  type Adjunto,
  type TipoAdjunto,
  descargarAdjunto,
  eliminarAdjunto,
  esImagen,
  formatearTamano,
  subirAdjunto,
} from "@/lib/adjuntos";
import { ApiError } from "@/lib/api";
import { reducirImagen } from "@/lib/reducir-imagen";

/**
 * Evidencia de una orden — TCI-43.
 *
 * El bucket de MinIO es privado, asi que las fotos no se pueden pintar con un
 * `<img src={...}>` apuntando a la API: la cookie de sesion es SameSite=Lax y
 * el navegador no la manda en peticiones de subrecurso a otro origen. Cada
 * miniatura baja su blob con `fetch` y lo muestra desde un object URL.
 *
 * La orden cerrada no admite cambios en su evidencia (el backend responde 422):
 * por eso `puedeEditar` apaga la subida y el borrado en vez de dejar botones
 * que solo servirian para mostrar un error.
 */
export function EvidenciaOrden({
  ordenId,
  adjuntos,
  puedeEditar,
  usuarioId,
  esAdmin,
  onCambio,
}: {
  ordenId: string;
  adjuntos: Adjunto[];
  puedeEditar: boolean;
  usuarioId: string | undefined;
  esAdmin: boolean;
  onCambio: () => Promise<void>;
}) {
  const [tipo, setTipo] = useState<TipoAdjunto>("EVIDENCIA_DESPUES");
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  async function alElegirArchivos(archivos: FileList | null) {
    if (!archivos?.length) return;

    setSubiendo(true);
    setError(null);
    try {
      // De uno en uno: el backend acepta un archivo por peticion, y en campo
      // conviene que un fallo no arrastre a los demas.
      for (const archivo of Array.from(archivos)) {
        await subirAdjunto(ordenId, await reducirImagen(archivo), tipo);
      }
      await onCambio();
    } catch (e: unknown) {
      setError(
        e instanceof ApiError ? e.message : "No se pudo subir el archivo.",
      );
    } finally {
      setSubiendo(false);
      // Permite volver a elegir el mismo archivo tras un fallo.
      if (entrada.current) entrada.current.value = "";
    }
  }

  async function borrar(adjunto: Adjunto) {
    setError(null);
    try {
      await eliminarAdjunto(ordenId, adjunto.id);
      await onCambio();
    } catch (e: unknown) {
      setError(
        e instanceof ApiError ? e.message : "No se pudo eliminar el archivo.",
      );
    }
  }

  const puedeBorrar = (adjunto: Adjunto) =>
    puedeEditar && (esAdmin || adjunto.usuario.id === usuarioId);

  return (
    <div className="space-y-4">
      {error && <Alerta>{error}</Alerta>}

      {adjuntos.length === 0 ? (
        <p className="text-sm text-tci-gris">
          Sin evidencia adjunta todavia.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {adjuntos.map((adjunto) => (
            <li key={adjunto.id}>
              <TarjetaAdjunto
                ordenId={ordenId}
                adjunto={adjunto}
                onBorrar={puedeBorrar(adjunto) ? () => borrar(adjunto) : null}
              />
            </li>
          ))}
        </ul>
      )}

      {puedeEditar && (
        <div className="space-y-3 rounded-lg bg-tci-humo p-4">
          <fieldset>
            <legend className="text-xs font-bold text-tci-gris uppercase">
              Clasificar como
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {TIPOS_ADJUNTO.map((valor) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setTipo(valor)}
                  aria-pressed={tipo === valor}
                  className={`rounded-full px-3 py-1.5 text-sm font-bold transition-colors ${
                    tipo === valor
                      ? "bg-tci-rojo text-white"
                      : "bg-white text-tci-grafito hover:bg-tci-borde"
                  }`}
                >
                  {ETIQUETA_ADJUNTO[valor]}
                </button>
              ))}
            </div>
          </fieldset>

          <input
            ref={entrada}
            type="file"
            accept={ACCEPT}
            multiple
            disabled={subiendo}
            onChange={(e) => void alElegirArchivos(e.target.files)}
            className="block w-full text-sm text-tci-grafito file:mr-3 file:rounded-lg file:border-0 file:bg-tci-rojo file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-white hover:file:bg-tci-rojo-hover disabled:opacity-50"
          />

          <p className="text-xs text-tci-gris">
            {subiendo
              ? "Subiendo..."
              : "Fotos (JPG, PNG, WEBP) o PDF, hasta 10 MB. Las fotos se reducen antes de subirlas para gastar menos datos."}
          </p>
        </div>
      )}
    </div>
  );
}

/** Miniatura de un adjunto, con su descarga y su boton de retirar. */
function TarjetaAdjunto({
  ordenId,
  adjunto,
  onBorrar,
}: {
  ordenId: string;
  adjunto: Adjunto;
  onBorrar: (() => Promise<void>) | null;
}) {
  const url = useObjectUrl(ordenId, adjunto);

  return (
    <figure className="group relative overflow-hidden rounded-lg border border-tci-borde bg-white">
      <a
        href={url ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        // Sin blob todavia no hay nada que abrir.
        aria-disabled={!url}
        className="block"
      >
        {esImagen(adjunto.mimeType) && url ? (
          // `next/image` no sirve aqui: la fuente es un blob: local que el
          // optimizador no puede resolver, y la miniatura ya viene reducida.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={adjunto.nombreArchivo}
            className="h-28 w-full bg-tci-humo object-cover"
          />
        ) : (
          <div className="flex h-28 w-full items-center justify-center bg-tci-humo text-sm font-bold text-tci-gris">
            {esImagen(adjunto.mimeType) ? "Cargando..." : "PDF"}
          </div>
        )}
      </a>

      <figcaption className="space-y-0.5 p-2">
        <p className="truncate text-xs font-bold text-tci-negro" title={adjunto.nombreArchivo}>
          {adjunto.nombreArchivo}
        </p>
        <p className="text-xs text-tci-gris">
          {ETIQUETA_ADJUNTO[adjunto.tipo]} · {formatearTamano(adjunto.tamanoBytes)}
        </p>
        <p className="truncate text-xs text-tci-gris">{adjunto.usuario.name}</p>
      </figcaption>

      {onBorrar && (
        <button
          type="button"
          onClick={() => void onBorrar()}
          aria-label={`Retirar ${adjunto.nombreArchivo}`}
          className="absolute top-1.5 right-1.5 rounded-full bg-black/60 px-2 py-1 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        >
          Retirar
        </button>
      )}
    </figure>
  );
}

/**
 * Baja el archivo y lo expone como object URL, liberandolo al desmontar.
 *
 * Sin el `revokeObjectURL` cada foto abierta se queda en memoria mientras dure
 * la pestana, que en un turno de campo son muchas.
 */
function useObjectUrl(ordenId: string, adjunto: Adjunto): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    let creada: string | null = null;

    descargarAdjunto(ordenId, adjunto.id)
      .then((blob) => {
        if (cancelado) return;
        creada = URL.createObjectURL(blob);
        setUrl(creada);
      })
      .catch(() => {
        // La tarjeta se queda con su marcador; el error real ya se vera al
        // intentar abrirla.
      });

    return () => {
      cancelado = true;
      if (creada) URL.revokeObjectURL(creada);
    };
  }, [ordenId, adjunto.id]);

  return url;
}

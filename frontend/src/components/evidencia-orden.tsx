"use client";

import { useEffect, useRef, useState } from "react";

import { Alerta } from "@/components/form";
import { IconoAdjuntar, IconoCamara } from "@/components/iconos";
import { Boton } from "@/components/ui";
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
  /**
   * Lo elegido pero aun no subido.
   *
   * Antes habia que clasificar primero y la foto se subia sola al elegirla:
   * el orden estaba invertido —se decide "antes o despues" cuando se tiene la
   * foto delante, no antes de tomarla— y ademas no habia forma de ver que se
   * estaba mandando ni de arrepentirse.
   */
  const [pendientes, setPendientes] = useState<
    { archivo: File; url: string | null }[]
  >([]);
  const camara = useRef<HTMLInputElement>(null);
  const entrada = useRef<HTMLInputElement>(null);

  // Los object URL de las miniaturas se liberan al soltar la cola, o el
  // navegador se queda con los blobs hasta recargar la pagina.
  useEffect(() => {
    return () => {
      for (const p of pendientes) if (p.url) URL.revokeObjectURL(p.url);
    };
  }, [pendientes]);

  function encolar(archivos: FileList | null) {
    if (!archivos?.length) return;
    setError(null);
    setPendientes((cola) => [
      ...cola,
      ...Array.from(archivos).map((archivo) => ({
        archivo,
        url: esImagen(archivo.type) ? URL.createObjectURL(archivo) : null,
      })),
    ]);
  }

  function quitarPendiente(indice: number) {
    setPendientes((cola) => {
      const fuera = cola[indice];
      if (fuera?.url) URL.revokeObjectURL(fuera.url);
      return cola.filter((_, i) => i !== indice);
    });
  }

  async function subirCola() {
    if (pendientes.length === 0) return;

    setSubiendo(true);
    setError(null);
    try {
      // De uno en uno: el backend acepta un archivo por peticion, y en campo
      // conviene que un fallo no arrastre a los demas.
      for (const { archivo } of pendientes) {
        await subirAdjunto(ordenId, await reducirImagen(archivo), tipo);
      }
      for (const p of pendientes) if (p.url) URL.revokeObjectURL(p.url);
      setPendientes([]);
      await onCambio();
    } catch (e: unknown) {
      // La cola se conserva: si fallo la tercera de cinco, rehacer las fotos
      // en campo no es una opcion razonable.
      setError(
        e instanceof ApiError ? e.message : "No se pudo subir el archivo.",
      );
    } finally {
      setSubiendo(false);
      if (camara.current) camara.current.value = "";
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
        <p className="text-sm text-tci-gris">Sin evidencia adjunta todavia.</p>
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
          {/*
            Los dos campos van ocultos y se disparan desde botones normales:
            el control nativo de archivo no se puede estilar ni dice "Tomar
            foto", y aqui la accion importa mas que el mecanismo.

            `capture="environment"` es lo que abre la camara trasera directa
            en el telefono. En escritorio el atributo se ignora y queda un
            selector de archivos, que es el comportamiento razonable.
          */}
          <input
            ref={camara}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => encolar(e.target.files)}
          />
          <input
            ref={entrada}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => encolar(e.target.files)}
          />

          <div className="flex flex-wrap gap-2">
            <Boton
              type="button"
              onClick={() => camara.current?.click()}
              disabled={subiendo}
            >
              <IconoCamara className="h-4 w-4" />
              Tomar foto
            </Boton>
            <Boton
              type="button"
              variante="secundario"
              onClick={() => entrada.current?.click()}
              disabled={subiendo}
            >
              <IconoAdjuntar className="h-4 w-4" />
              Adjuntar archivo
            </Boton>
          </div>

          {pendientes.length === 0 ? (
            <p className="text-xs text-tci-gris">
              Fotos (JPG, PNG, WEBP) o PDF, hasta 10 MB. Las fotos se reducen
              antes de subirlas para gastar menos datos.
            </p>
          ) : (
            <div className="space-y-3 border-t border-tci-borde pt-3">
              <ul className="flex flex-wrap gap-2">
                {pendientes.map((p, i) => (
                  <li key={i} className="relative">
                    {p.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.url}
                        alt={p.archivo.name}
                        className="h-20 w-20 rounded-lg border border-tci-borde object-cover"
                      />
                    ) : (
                      <span className="flex h-20 w-20 items-center justify-center rounded-lg border border-tci-borde bg-white p-1 text-center text-[0.625rem] break-all text-tci-gris">
                        {p.archivo.name}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => quitarPendiente(i)}
                      disabled={subiendo}
                      aria-label={`Quitar ${p.archivo.name}`}
                      className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-tci-negro text-white transition-colors hover:bg-tci-rojo disabled:opacity-50"
                    >
                      <span aria-hidden>&times;</span>
                    </button>
                  </li>
                ))}
              </ul>

              {/*
                La clasificacion aparece aqui y no antes: se decide "antes o
                despues" con la foto delante, que es cuando se sabe.
              */}
              <fieldset>
                <legend className="text-xs font-bold text-tci-gris uppercase">
                  {pendientes.length === 1
                    ? "Esta foto es de"
                    : "Estas fotos son de"}
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TIPOS_ADJUNTO.map((valor) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => setTipo(valor)}
                      aria-pressed={tipo === valor}
                      disabled={subiendo}
                      className={`h-9 rounded-full px-4 text-sm font-semibold transition-colors md:h-8 ${
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

              <Boton
                type="button"
                onClick={() => void subirCola()}
                cargando={subiendo}
                className="w-full sm:w-auto"
              >
                {subiendo
                  ? "Subiendo..."
                  : pendientes.length === 1
                    ? "Subir 1 archivo"
                    : `Subir ${pendientes.length} archivos`}
              </Boton>
            </div>
          )}
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
        <p
          className="truncate text-xs font-bold text-tci-negro"
          title={adjunto.nombreArchivo}
        >
          {adjunto.nombreArchivo}
        </p>
        <p className="text-xs text-tci-gris">
          {ETIQUETA_ADJUNTO[adjunto.tipo]} ·{" "}
          {formatearTamano(adjunto.tamanoBytes)}
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

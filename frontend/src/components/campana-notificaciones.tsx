"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { IconoCampana } from "@/components/iconos";
import {
  haceCuanto,
  marcarLeida,
  marcarTodasLeidas,
  obtenerBandeja,
  type Notificacion,
} from "@/lib/notificaciones";

/** Cada cuanto se relee la bandeja, en milisegundos. */
const INTERVALO = 60_000;

/**
 * TCI-53 — la bandeja de notificaciones del usuario.
 *
 * Vive en la barra lateral porque tiene que verse desde cualquier pantalla: una
 * bandeja a la que hay que navegar no la mira nadie.
 *
 * **Se refresca sondeando cada minuto, no por SSE.** El canal SSE que existe
 * (TCI-42) esta atado a una orden concreta: sirve para que el detalle abierto
 * se actualice, no para avisar de algo que ocurre en otra parte. Un canal
 * global por usuario es otra cosa y no la pedia ningun work item; un sondeo de
 * un minuto es suficiente para un aviso que no es urgente al segundo.
 */
export function CampanaNotificaciones() {
  const [abierta, setAbierta] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const contenedor = useRef<HTMLDivElement>(null);

  const releer = useCallback(async () => {
    try {
      const bandeja = await obtenerBandeja();
      setNotificaciones(bandeja.data);
      setNoLeidas(bandeja.noLeidas);
    } catch {
      // Un fallo al sondear no puede molestar: se reintenta al minuto.
    }
  }, []);

  useEffect(() => {
    let cancelado = false;

    // La carga va en una cadena de promesas y no llamando a `releer()` a secas:
    // asi el `setState` ocurre en un callback y no en el cuerpo del efecto,
    // que es lo que pide react-hooks y lo que hace el resto de pantallas.
    const cargar = () => {
      obtenerBandeja()
        .then((bandeja) => {
          if (cancelado) return;
          setNotificaciones(bandeja.data);
          setNoLeidas(bandeja.noLeidas);
        })
        .catch(() => undefined);
    };

    cargar();
    const id = setInterval(cargar, INTERVALO);
    return () => {
      cancelado = true;
      clearInterval(id);
    };
  }, []);

  // Cerrar al pulsar fuera. Sin esto el panel se queda abierto tapando la
  // navegacion mientras el usuario intenta ir a otro sitio.
  useEffect(() => {
    if (!abierta) return;
    const alPulsar = (evento: MouseEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) {
        setAbierta(false);
      }
    };
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierta(false);
    };
    document.addEventListener("mousedown", alPulsar);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("mousedown", alPulsar);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierta]);

  async function abrir(notificacion: Notificacion) {
    setAbierta(false);
    if (notificacion.leidaEn) return;
    try {
      await marcarLeida(notificacion.id);
      await releer();
    } catch {
      // Que no se marque no impide navegar: el enlace ya se siguio.
    }
  }

  async function marcarTodas() {
    try {
      await marcarTodasLeidas();
      await releer();
    } catch {
      // Sin ruido: el contador se corrige en el siguiente sondeo.
    }
  }

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        onClick={() => setAbierta((a) => !a)}
        aria-expanded={abierta}
        aria-label={
          noLeidas > 0
            ? `Notificaciones, ${noLeidas} sin leer`
            : "Notificaciones"
        }
        className="relative flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-white/65 transition-colors hover:bg-white/5 hover:text-white"
      >
        <IconoCampana className="h-5 w-5" />
        Notificaciones
        {noLeidas > 0 && (
          <span className="ml-auto rounded-full bg-tci-rojo px-2 py-0.5 text-xs font-bold text-white">
            {noLeidas > 99 ? "99+" : noLeidas}
          </span>
        )}
      </button>

      {abierta && (
        <div className="absolute bottom-full left-0 z-50 mb-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-tci-borde bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-tci-borde px-4 py-3">
            <p className="text-sm font-semibold text-tci-negro">
              Notificaciones
            </p>
            {noLeidas > 0 && (
              <button
                onClick={() => void marcarTodas()}
                className="text-xs font-semibold text-tci-gris underline-offset-2 hover:text-tci-rojo hover:underline"
              >
                Marcar todas
              </button>
            )}
          </div>

          {notificaciones.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-tci-gris">
              No tiene notificaciones.
            </p>
          ) : (
            <ul>
              {notificaciones.map((notificacion) => (
                <li
                  key={notificacion.id}
                  className="border-b border-tci-borde last:border-0"
                >
                  <Entrada notificacion={notificacion} onAbrir={abrir} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Una entrada. Es enlace si la notificacion lleva a algun sitio y boton si no:
 * un `<a>` sin destino no se puede seguir con el teclado ni se anuncia bien.
 */
function Entrada({
  notificacion,
  onAbrir,
}: {
  notificacion: Notificacion;
  onAbrir: (n: Notificacion) => Promise<void>;
}) {
  const contenido = (
    <>
      <div className="flex items-start gap-2">
        {/* El punto marca lo no leido. Va ademas del fondo, no en su lugar:
            un fondo apenas mas claro no se distingue en una pantalla al sol. */}
        {!notificacion.leidaEn && (
          <span
            aria-hidden
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-tci-rojo"
          />
        )}
        <p
          className={`text-sm ${
            notificacion.leidaEn
              ? "text-tci-grafito"
              : "font-semibold text-tci-negro"
          }`}
        >
          {notificacion.titulo}
        </p>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-tci-gris">
        {notificacion.cuerpo}
      </p>
      <p className="mt-1 text-xs text-tci-gris/80">
        {haceCuanto(notificacion.createdAt)}
      </p>
    </>
  );

  const clases = `block w-full px-4 py-3 text-left transition-colors hover:bg-tci-humo ${
    notificacion.leidaEn ? "" : "bg-tci-rojo/[0.03]"
  }`;

  if (notificacion.enlace) {
    return (
      <Link
        href={notificacion.enlace}
        onClick={() => void onAbrir(notificacion)}
        className={clases}
      >
        {contenido}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void onAbrir(notificacion)}
      className={clases}
    >
      {contenido}
    </button>
  );
}

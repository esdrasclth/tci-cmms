"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lienzo para la firma de conformidad del cliente.
 *
 * El tecnico termina, le pasa el telefono al encargado de planta y este firma
 * con el dedo. Es la prueba que hoy se resuelve con papel.
 *
 * Tres cosas que no se ven pero deciden si se puede firmar:
 *
 *  - **`touch-action: none` en el lienzo.** Sin eso, arrastrar el dedo
 *    desplaza la pagina en vez de dibujar, y no hay forma de firmar en un
 *    telefono.
 *  - **Se dibuja a la resolucion real de la pantalla.** Un lienzo de 600 CSS
 *    px en una pantalla de densidad 3 tiene 1800 px reales; si se dibuja a 600
 *    la firma sale pixelada. Se escala por `devicePixelRatio`.
 *  - **Eventos de puntero, no de raton ni de tacto.** Cubren dedo, lapiz y
 *    raton con un solo juego de manejadores, y `setPointerCapture` mantiene el
 *    trazo aunque el dedo se salga del lienzo a media firma.
 */
export function LienzoFirma({
  onCambio,
  deshabilitado = false,
}: {
  /** Recibe el PNG de la firma, o `null` si se borro. */
  onCambio: (firma: Blob | null) => void;
  deshabilitado?: boolean;
}) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const [tieneTrazo, setTieneTrazo] = useState(false);

  // Ajustar el lienzo a su tamano real en pantalla. Se rehace al cambiar el
  // tamano de la ventana porque girar el telefono cambia el ancho disponible.
  useEffect(() => {
    const nodo = lienzo.current;
    if (!nodo) return;

    const ajustar = () => {
      const escala = window.devicePixelRatio || 1;
      const caja = nodo.getBoundingClientRect();
      nodo.width = Math.round(caja.width * escala);
      nodo.height = Math.round(caja.height * escala);
      const ctx = nodo.getContext("2d");
      if (!ctx) return;
      ctx.scale(escala, escala);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#17181a";
    };

    ajustar();
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, []);

  function punto(evento: React.PointerEvent<HTMLCanvasElement>) {
    const caja = evento.currentTarget.getBoundingClientRect();
    return { x: evento.clientX - caja.left, y: evento.clientY - caja.top };
  }

  function empezar(evento: React.PointerEvent<HTMLCanvasElement>) {
    if (deshabilitado) return;
    const ctx = lienzo.current?.getContext("2d");
    if (!ctx) return;
    evento.currentTarget.setPointerCapture(evento.pointerId);
    dibujando.current = true;
    const { x, y } = punto(evento);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function mover(evento: React.PointerEvent<HTMLCanvasElement>) {
    if (!dibujando.current) return;
    const ctx = lienzo.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = punto(evento);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!tieneTrazo) setTieneTrazo(true);
  }

  function terminar() {
    if (!dibujando.current) return;
    dibujando.current = false;
    exportar();
  }

  function exportar() {
    const nodo = lienzo.current;
    if (!nodo) return;
    // PNG y no JPEG: la firma es trazo negro sobre blanco, donde JPEG mete
    // artefactos alrededor de cada linea y pesa mas, no menos.
    nodo.toBlob((blob) => onCambio(blob), "image/png");
  }

  function limpiar() {
    const nodo = lienzo.current;
    const ctx = nodo?.getContext("2d");
    if (!nodo || !ctx) return;
    // En unidades del lienzo, no de CSS: la transformacion sigue escalada.
    ctx.clearRect(0, 0, nodo.width, nodo.height);
    setTieneTrazo(false);
    onCambio(null);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold tracking-[-0.01em] text-tci-negro">
          Firma de conformidad
        </span>
        {tieneTrazo && (
          <button
            type="button"
            onClick={limpiar}
            disabled={deshabilitado}
            className="text-xs font-semibold text-tci-gris underline-offset-2 hover:text-tci-rojo hover:underline"
          >
            Borrar y repetir
          </button>
        )}
      </div>

      <canvas
        ref={lienzo}
        onPointerDown={empezar}
        onPointerMove={mover}
        onPointerUp={terminar}
        onPointerCancel={terminar}
        // `touch-none` es lo que permite firmar con el dedo: sin ello el
        // gesto lo captura el desplazamiento de la pagina.
        className="mt-1.5 h-40 w-full touch-none rounded-lg border border-dashed border-tci-borde bg-white"
      />

      <p className="mt-1.5 text-xs text-tci-gris">
        {tieneTrazo
          ? "Firme quien recibe el trabajo. Se guarda junto a la evidencia de la orden."
          : "Opcional. Pase el telefono a quien recibe el trabajo para que firme aqui."}
      </p>
    </div>
  );
}

/** Etiqueta con la que viaja la firma, para reconocerla en los adjuntos. */
export const NOMBRE_FIRMA = "firma-conformidad.png";

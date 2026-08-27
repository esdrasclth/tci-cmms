"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { useBloqueoScroll } from "@/lib/hooks";

/**
 * Hoja que sube desde el borde inferior. Solo se usa en movil.
 *
 * Sustituye al cajon lateral, que era la barra de escritorio metida en 288px.
 * El motivo no es estetico: la hamburguesa vive arriba a la izquierda, que es
 * el punto mas lejano para el pulgar de quien sostiene el telefono con una
 * mano. Subiendo el contenido al borde inferior, todo lo que hay que tocar
 * queda en el arco natural del pulgar. Con guantes, en planta, eso es la
 * diferencia entre acertar y no (TCI-44).
 *
 * Se cierra de cuatro formas: arrastrando hacia abajo, tocando el fondo, con
 * Escape y al navegar. Cuantas mas salidas, menos se siente como una trampa.
 *
 * La animacion de entrada es CSS y no estado: montarla con un `setState` en un
 * efecto es justo lo que desaconseja `react-hooks/set-state-in-effect`, y
 * ademas la deja a merced del ciclo de React en vez del compositor.
 */
export function HojaInferior({
  abierta,
  onCerrar,
  etiqueta,
  children,
}: {
  abierta: boolean;
  onCerrar: () => void;
  /** Nombre accesible del dialogo. */
  etiqueta: string;
  children: ReactNode;
}) {
  const [arrastre, setArrastre] = useState(0);

  // `overflow: hidden` en el body no basta: Safari de iOS lo ignora.
  useBloqueoScroll(abierta);
  const inicioY = useRef<number | null>(null);

  useEffect(() => {
    if (!abierta) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alPulsar);
    return () => {
      document.removeEventListener("keydown", alPulsar);
    };
  }, [abierta, onCerrar]);

  if (!abierta) return null;

  function alEmpezar(e: React.TouchEvent) {
    inicioY.current = e.touches[0].clientY;
  }

  function alMover(e: React.TouchEvent) {
    if (inicioY.current === null) return;
    // Solo hacia abajo: tirar hacia arriba no debe despegar la hoja.
    setArrastre(Math.max(0, e.touches[0].clientY - inicioY.current));
  }

  function alSoltar() {
    // 80px distingue un gesto deliberado de un roce al desplazar la lista.
    if (arrastre > 80) onCerrar();
    else setArrastre(0);
    inicioY.current = null;
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Cerrar menú"
        onClick={onCerrar}
        className="absolute inset-0 h-full w-full animate-[tci-aparecer_200ms_ease-out] bg-black/50"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={etiqueta}
        style={
          arrastre
            ? // Mientras el dedo manda no hay transicion, o la hoja va por
              // detras del gesto y se siente pastosa.
              { transform: `translateY(${arrastre}px)`, transition: "none" }
            : { transition: "transform 200ms ease-out" }
        }
        className="absolute inset-x-0 bottom-0 max-h-[85dvh] animate-[tci-subir_250ms_ease-out] overscroll-contain overflow-y-auto rounded-t-2xl bg-tci-negro pb-[env(safe-area-inset-bottom)]"
      >
        {/* El tirador no es decorativo: anuncia que la hoja se puede arrastrar.
            Su zona tactil abarca toda la franja, no solo la barrita. */}
        <div
          onTouchStart={alEmpezar}
          onTouchMove={alMover}
          onTouchEnd={alSoltar}
          className="flex cursor-grab justify-center py-3 active:cursor-grabbing"
        >
          <span aria-hidden className="h-1 w-10 rounded-full bg-white/25" />
        </div>

        {children}
      </div>
    </div>
  );
}

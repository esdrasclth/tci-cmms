"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Boton, clasesBoton } from "@/components/ui";

/**
 * Pantalla de error de las rutas del panel.
 *
 * Sin este archivo, un fallo de render en produccion deja la pantalla en la
 * salida cruda de Next: sin marca, sin explicacion y sin salida. Con el, quien
 * se lo encuentre sabe que paso, puede reintentar sin recargar y, si insiste,
 * tiene un camino de vuelta.
 *
 * `reset()` vuelve a montar el arbol que fallo. Sirve para el caso comun —una
 * peticion que se cayo, una respuesta a medias— y no obliga a recargar la
 * aplicacion entera.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sin esto el fallo se pierde: en produccion Next no lo escribe solo.
    console.error("[panel] error de render:", error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center bg-tci-humo px-4 py-10">
      <div className="w-full max-w-md text-center">
        <p className="font-mono text-xs tracking-[0.14em] text-tci-gris uppercase">
          Error inesperado
        </p>
        <h1 className="tci-display mt-2 text-2xl font-semibold text-tci-negro">
          Esta pantalla no se pudo mostrar
        </h1>
        <p className="mt-3 text-sm text-tci-grafito">
          El fallo esta en la aplicacion, no en lo que usted hizo. Sus datos no
          se han perdido: nada de lo que estuviera guardado se ve afectado.
        </p>

        {error.digest && (
          <p className="mt-4 font-mono text-xs text-tci-gris">
            Referencia: {error.digest}
          </p>
        )}

        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <Boton onClick={reset}>Reintentar</Boton>
          <Link
            href="/panel"
            className={clasesBoton({ variante: "secundario" })}
          >
            Volver al listado
          </Link>
        </div>

        <p className="mt-6 text-xs text-tci-gris">
          Si vuelve a ocurrir, avise al equipo con la referencia de arriba.
        </p>
      </div>
    </main>
  );
}

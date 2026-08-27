import Link from "next/link";

import { clasesBoton } from "@/components/estilos";

/**
 * Direccion que no existe.
 *
 * Se llega aqui por un enlace viejo o por una orden que se borro. En los dos
 * casos lo util no es decir "404" sino dar el camino de vuelta, que casi
 * siempre es el listado.
 */
export default function NoEncontrado() {
  return (
    <main className="grid min-h-dvh place-items-center bg-tci-humo px-4 py-10">
      <div className="w-full max-w-md text-center">
        <p className="font-mono text-xs tracking-[0.14em] text-tci-gris uppercase">
          Error 404
        </p>
        <h1 className="tci-display mt-2 text-2xl font-semibold text-tci-negro">
          Esta pagina no existe
        </h1>
        <p className="mt-3 text-sm text-tci-grafito">
          La direccion es incorrecta, o lo que habia aqui se elimino. Si llego
          desde un enlace guardado, es probable que sea de una version anterior.
        </p>

        <div className="mt-7">
          <Link href="/panel" className={clasesBoton()}>
            Ir al listado de ordenes
          </Link>
        </div>
      </div>
    </main>
  );
}

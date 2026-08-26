"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BarraLateral, destinosDe } from "@/components/barra-lateral";
import { IconoCerrar, IconoMenu } from "@/components/iconos";
import { signOut, useSession } from "@/lib/auth-client";

/**
 * Marco comun del panel: navegacion lateral y guarda de sesion.
 *
 * La guarda es del lado del cliente a proposito: el backend vive en otro origen
 * y dar por hecho que su cookie llega al servidor de Next solo funciona mientras
 * compartan host. Cuando el despliegue fije los dominios (TCI-70) esto puede
 * pasar a un middleware.
 *
 * La barra es fija en escritorio y un cajon sobre el contenido en movil, donde
 * 256px de navegacion permanente no dejarian sitio para trabajar (TCI-44).
 */
export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  const router = useRouter();
  const ruta = usePathname();
  const { data: sesion, isPending } = useSession();
  const [cajonAbierto, setCajonAbierto] = useState(false);

  useEffect(() => {
    if (!isPending && !sesion) {
      router.replace("/login");
    }
  }, [isPending, sesion, router]);

  // Escape cierra el cajon: es un panel modal y debe poder abandonarse sin
  // apuntar al boton, que en movil queda arriba del todo.
  useEffect(() => {
    if (!cajonAbierto) return;
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setCajonAbierto(false);
    };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [cajonAbierto]);

  if (isPending || !sesion) {
    return (
      <main className="grid min-h-screen place-items-center bg-tci-humo">
        <p className="text-sm text-tci-gris">Cargando...</p>
      </main>
    );
  }

  const esAdmin = sesion.user.rol === "ADMIN";
  const destinos = destinosDe(esAdmin);
  const usuario = {
    nombre: sesion.user.name,
    correo: sesion.user.email,
    esAdmin,
  };

  async function salir() {
    await signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-tci-humo">
      {/* Escritorio: columna fija. `fixed` y no una celda de rejilla para que
          la barra no se desplace al hacer scroll en listados largos. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <BarraLateral
          destinos={destinos}
          ruta={ruta}
          usuario={usuario}
          onSalir={() => void salir()}
        />
      </aside>

      {/* Movil: barra superior minima, solo marca y acceso a la navegacion. */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 bg-tci-negro px-4 py-3 lg:hidden">
        <Link href="/panel" aria-label="Ir al listado de ordenes">
          <Image
            src="/logo-tci.png"
            alt="TCI"
            width={4586}
            height={1335}
            priority
            className="h-10 w-auto"
          />
        </Link>
        <button
          type="button"
          onClick={() => setCajonAbierto(true)}
          aria-expanded={cajonAbierto}
          aria-controls="cajon-navegacion"
          className="rounded-lg border border-white/25 p-2.5 text-white transition-colors hover:bg-white/10"
        >
          <span className="sr-only">Abrir navegación</span>
          <IconoMenu />
        </button>
      </header>

      {cajonAbierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar navegación"
            onClick={() => setCajonAbierto(false)}
            className="absolute inset-0 h-full w-full bg-black/50"
          />
          <div
            id="cajon-navegacion"
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl"
          >
            <BarraLateral
              destinos={destinos}
              ruta={ruta}
              usuario={usuario}
              onSalir={() => void salir()}
              onNavegar={() => setCajonAbierto(false)}
            />
            <button
              type="button"
              onClick={() => setCajonAbierto(false)}
              className="absolute top-6 right-3 rounded-lg p-2 text-white/65 transition-colors hover:bg-white/10 hover:text-white"
            >
              <span className="sr-only">Cerrar navegación</span>
              <IconoCerrar />
            </button>
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

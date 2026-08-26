"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { signOut, useSession } from "@/lib/auth-client";

/**
 * Marco comun del panel: cabecera y guarda de sesion.
 *
 * La guarda es del lado del cliente a proposito: el backend vive en otro origen
 * y dar por hecho que su cookie llega al servidor de Next solo funciona mientras
 * compartan host. Cuando el despliegue fije los dominios (TCI-70) esto puede
 * pasar a un middleware.
 */
export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  const router = useRouter();
  const ruta = usePathname();
  const { data: sesion, isPending } = useSession();
  const [menuAbierto, setMenuAbierto] = useState(false);


  useEffect(() => {
    if (!isPending && !sesion) {
      router.replace("/login");
    }
  }, [isPending, sesion, router]);

  const esAdmin = sesion?.user.rol === "ADMIN";

  async function salir() {
    await signOut();
    router.replace("/login");
  }

  if (isPending || !sesion) {
    return (
      <main className="grid min-h-screen place-items-center bg-tci-humo">
        <p className="text-sm text-tci-gris">Cargando...</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-tci-humo">
      <header className="bg-tci-negro">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/panel" aria-label="Ir al listado de ordenes">
            <Image
              src="/logo-tci.png"
              alt="TCI"
              width={4586}
              height={1335}
              // Igual que en el login: por debajo de ~40px el subtitulo del
              // logotipo se empasta y deja de leerse. Por eso en movil no se
              // encoge, se encoge el resto de la cabecera.
              className="h-10 w-auto"
            />
          </Link>

          {/* Escritorio: todo en linea. */}
          <div className="hidden items-center gap-2 lg:flex">
            {esAdmin && <Enlaces ruta={ruta} />}
            <BotonSalir onSalir={salir} className="ml-2" />
          </div>

          {/* Movil: cinco enlaces mas el logo no caben en 375px, asi que la
              navegacion se pliega en un panel desplegable. El tecnico no tiene
              enlaces, solo salir: plegarlo seria esconder un unico boton que
              cabe de sobra al lado del logo. */}
          {esAdmin ? (
            <button
              type="button"
              onClick={() => setMenuAbierto((abierto) => !abierto)}
              aria-expanded={menuAbierto}
              aria-controls="menu-panel"
              className="rounded-lg border border-white/25 p-2.5 text-white transition-colors hover:bg-white/10 lg:hidden"
            >
              <span className="sr-only">
                {menuAbierto ? "Cerrar menu" : "Abrir menu"}
              </span>
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                {menuAbierto ? (
                  <path d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          ) : (
            <BotonSalir onSalir={salir} className="lg:hidden" />
          )}
        </div>

        {menuAbierto && (
          <div
            id="menu-panel"
            className="border-t border-white/10 px-4 pb-4 lg:hidden"
          >
            <div className="flex flex-col gap-1 py-2">
              <Enlaces ruta={ruta} onNavegar={() => setMenuAbierto(false)} />
            </div>
            <BotonSalir onSalir={salir} className="w-full" />
          </div>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}

/**
 * Los enlaces del panel, compartidos por la barra de escritorio y el menu
 * plegable de movil. Se declaran una sola vez para que no se desincronicen.
 */
function Enlaces({
  ruta,
  onNavegar,
}: {
  ruta: string;
  /**
   * Cierra el menu de movil al pulsar. Se hace al pulsar y no vigilando la
   * ruta con un efecto: el efecto reacciona tarde y ademas dispara un render
   * de mas en escritorio, donde el menu ni siquiera existe.
   */
  onNavegar?: () => void;
}) {
  const comunes = { onNavegar };
  return (
    <>
      <Enlace href="/panel" activo={ruta === "/panel"} {...comunes}>
        Ordenes
      </Enlace>
      <Enlace
        href="/panel/clientes"
        activo={ruta.startsWith("/panel/clientes")}
        {...comunes}
      >
        Clientes
      </Enlace>
      <Enlace
        href="/panel/equipos"
        activo={ruta.startsWith("/panel/equipos")}
        {...comunes}
      >
        Equipos
      </Enlace>
      <Enlace
        href="/panel/tipos-mantenimiento"
        activo={ruta.startsWith("/panel/tipos-mantenimiento")}
        {...comunes}
      >
        Tipos
      </Enlace>
      <Enlace
        href="/panel/usuarios"
        activo={ruta.startsWith("/panel/usuarios")}
        {...comunes}
      >
        Usuarios
      </Enlace>
    </>
  );
}

function Enlace({
  href,
  activo,
  children,
  onNavegar,
}: {
  href: string;
  activo: boolean;
  children: React.ReactNode;
  onNavegar?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavegar}
      aria-current={activo ? "page" : undefined}
      // min-h-11 en movil: por debajo de ~44px el objetivo tactil se falla con
      // guantes puestos, que es como se usa esto en planta.
      className={`flex min-h-11 items-center rounded-lg px-3 text-sm transition-colors lg:min-h-0 lg:py-2 ${
        activo
          ? "bg-white/15 font-bold text-white"
          : "text-white/70 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}

function BotonSalir({
  onSalir,
  className = "",
}: {
  onSalir: () => Promise<void>;
  className?: string;
}) {
  return (
    <button
      onClick={() => void onSalir()}
      className={`min-h-11 rounded-lg border border-white/25 px-4 text-sm text-white transition-colors hover:bg-white/10 ${className}`}
    >
      Cerrar sesion
    </button>
  );
}

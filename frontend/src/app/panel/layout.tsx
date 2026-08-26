"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

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

  useEffect(() => {
    if (!isPending && !sesion) {
      router.replace("/login");
    }
  }, [isPending, sesion, router]);

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
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/panel" aria-label="Ir al listado de ordenes">
            <Image
              src="/logo-tci.png"
              alt="TCI"
              width={4586}
              height={1335}
              // Igual que en el login: por debajo de ~40px el subtitulo del
              // logotipo se empasta y deja de leerse.
              className="h-10 w-auto"
            />
          </Link>
          <div className="flex items-center gap-2">
            {sesion.user.rol === "ADMIN" && (
              <nav className="flex items-center gap-1">
                <Enlace href="/panel" activo={ruta === "/panel"}>
                  Ordenes
                </Enlace>
                <Enlace
                  href="/panel/clientes"
                  activo={ruta.startsWith("/panel/clientes")}
                >
                  Clientes
                </Enlace>
                <Enlace
                  href="/panel/equipos"
                  activo={ruta.startsWith("/panel/equipos")}
                >
                  Equipos
                </Enlace>
                <Enlace
                  href="/panel/tipos-mantenimiento"
                  activo={ruta.startsWith("/panel/tipos-mantenimiento")}
                >
                  Tipos
                </Enlace>
                <Enlace
                  href="/panel/usuarios"
                  activo={ruta.startsWith("/panel/usuarios")}
                >
                  Usuarios
                </Enlace>
              </nav>
            )}
            <button
              onClick={async () => {
                await signOut();
                router.replace("/login");
              }}
              className="ml-2 rounded-lg border border-white/25 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10"
            >
              Cerrar sesion
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}

function Enlace({
  href,
  activo,
  children,
}: {
  href: string;
  activo: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className={`rounded-lg px-3 py-2 text-sm transition-colors ${
        activo ? "bg-white/15 font-bold text-white" : "text-white/70 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}

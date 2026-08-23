"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ListaOrdenes } from "@/components/lista-ordenes";
import { signOut, useSession } from "@/lib/auth-client";

/**
 * Panel principal (TCI-41).
 *
 * Muestra el listado de ordenes: todas para un administrador, solo las
 * asignadas para un tecnico. El filtrado por rol lo hace el backend.
 *
 * La guarda es del lado del cliente a proposito: el backend vive en otro origen
 * y dar por hecho que su cookie llega al servidor de Next solo funciona en
 * local. Cuando el despliegue fije los dominios (TCI-70) esto puede pasar a un
 * middleware.
 */
export default function PanelPage() {
  const router = useRouter();
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

  const esAdmin = sesion.user.rol === "ADMIN";

  return (
    <div className="min-h-screen bg-tci-humo">
      <header className="bg-tci-negro">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Image
            src="/logo-tci.png"
            alt="TCI"
            width={4586}
            height={1335}
            // Igual que en el login: por debajo de ~40px el subtitulo del
            // logotipo se empasta y deja de leerse.
            className="h-10 w-auto"
          />
          <button
            onClick={async () => {
              await signOut();
              router.replace("/login");
            }}
            className="rounded-lg border border-white/25 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10"
          >
            Cerrar sesion
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-tci-negro">
            Hola, {sesion.user.name}
          </h1>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              esAdmin
                ? "bg-tci-rojo text-white"
                : "bg-tci-borde text-tci-grafito"
            }`}
          >
            {esAdmin ? "Administrador" : "Tecnico"}
          </span>
        </div>
        <p className="mt-1 text-sm text-tci-gris">{sesion.user.email}</p>

        <div className="mt-8">
          <ListaOrdenes esAdmin={esAdmin} />
        </div>
      </main>
    </div>
  );
}

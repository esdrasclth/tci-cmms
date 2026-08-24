"use client";

import Link from "next/link";

import { GestionEquipos } from "@/components/gestion-equipos";
import { useSession } from "@/lib/auth-client";

/** Solo administradores. El corte real lo hace el backend con @Roles(ADMIN). */
export default function EquiposPage() {
  const { data: sesion } = useSession();
  if (!sesion) return null;

  if (sesion.user.rol !== "ADMIN") {
    return (
      <div className="rounded-xl border border-dashed border-tci-borde bg-white p-8 text-center">
        <p className="text-sm text-tci-grafito">
          Esta seccion es solo para administradores.
        </p>
        <Link
          href="/panel"
          className="mt-3 inline-block text-sm font-bold text-tci-negro underline-offset-2 hover:text-tci-rojo hover:underline"
        >
          &larr; Volver a mis ordenes
        </Link>
      </div>
    );
  }

  return <GestionEquipos />;
}

"use client";

import Link from "next/link";

import { CalendarioPreventivo } from "@/components/calendario-preventivo";
import { useSession } from "@/lib/auth-client";

/** TCI-51 — calendario de mantenimientos preventivos. Solo administradores. */
export default function CalendarioPage() {
  const { data: sesion } = useSession();
  if (!sesion) return null;

  if (sesion.user.rol !== "ADMIN") {
    return (
      <div className="rounded-xl border border-dashed border-tci-borde bg-white p-8 text-center">
        <p className="text-sm text-tci-grafito">
          Esta sección es solo para administradores.
        </p>
        <Link
          href="/panel"
          className="mt-3 inline-block text-sm font-bold text-tci-negro underline-offset-2 hover:text-tci-rojo hover:underline"
        >
          &larr; Volver a mis órdenes
        </Link>
      </div>
    );
  }

  return <CalendarioPreventivo />;
}

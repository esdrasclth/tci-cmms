"use client";

import Link from "next/link";

import { TableroReportes } from "@/components/tablero-reportes";
import { useSession } from "@/lib/auth-client";

/**
 * TCI-58 y TCI-60 — reportes e indicadores.
 *
 * Solo administradores: son las preguntas de la gerencia sobre el trabajo del
 * equipo. El corte real lo hace el backend con @Roles(ADMIN).
 */
export default function ReportesPage() {
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

  return <TableroReportes />;
}

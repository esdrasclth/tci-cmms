"use client";

import Link from "next/link";

import { GestionRepuestos } from "@/components/gestion-repuestos";
import { useSession } from "@/lib/auth-client";

/**
 * TCI-45 — catalogo de repuestos y existencias de almacen.
 *
 * Solo administradores. El corte real lo hace el backend con @Roles(ADMIN);
 * esto solo evita mostrar una pantalla que respondera 403 entera.
 */
export default function RepuestosPage() {
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

  return <GestionRepuestos />;
}

"use client";

import Link from "next/link";

import { LibroInventario } from "@/components/libro-inventario";
import { useSession } from "@/lib/auth-client";

/**
 * TCI-48 — historial de movimientos de almacen. Solo administradores: es
 * informacion de compras y control, no de campo.
 */
export default function MovimientosPage() {
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

  return <LibroInventario />;
}

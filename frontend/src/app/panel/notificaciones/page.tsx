"use client";

import Link from "next/link";

import { GestionNotificaciones } from "@/components/gestion-notificaciones";
import { useSession } from "@/lib/auth-client";

/**
 * TCI-54, TCI-55 y TCI-56 — configuracion de notificaciones.
 *
 * Solo administradores: decidir que se avisa y a quien es una regla del
 * sistema, no una preferencia personal. El corte real lo hace el backend.
 */
export default function NotificacionesPage() {
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

  return <GestionNotificaciones />;
}

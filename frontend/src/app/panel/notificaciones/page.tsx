import type { Metadata } from "next";

import { SoloAdmin } from "@/components/solo-admin";
import { GestionNotificaciones } from "@/components/gestion-notificaciones";

export const metadata: Metadata = { title: "Notificaciones" };

/**
 * TCI-54, TCI-55 y TCI-56 — configuracion de notificaciones.
 *
 * Solo administradores: decidir que se avisa y a quien es una regla del
 * sistema, no una preferencia personal. El corte real lo hace el backend.
 */
export default function Pagina() {
  return (
    <SoloAdmin>
      <GestionNotificaciones />
    </SoloAdmin>
  );
}

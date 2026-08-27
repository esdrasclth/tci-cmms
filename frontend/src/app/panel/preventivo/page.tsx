import type { Metadata } from "next";

import { SoloAdmin } from "@/components/solo-admin";
import { GestionPreventivo } from "@/components/gestion-preventivo";

export const metadata: Metadata = { title: "Mantenimiento preventivo" };

/**
 * TCI-49 — planes de mantenimiento preventivo.
 *
 * Solo administradores: planificar el mantenimiento es decision de la gerencia.
 * El tecnico ve el resultado —las ordenes que el plan genere— por el camino de
 * siempre. El corte real lo hace el backend con @Roles(ADMIN).
 */
export default function Pagina() {
  return (
    <SoloAdmin>
      <GestionPreventivo />
    </SoloAdmin>
  );
}

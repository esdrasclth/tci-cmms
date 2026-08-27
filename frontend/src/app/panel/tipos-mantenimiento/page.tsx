import type { Metadata } from "next";

import { SoloAdmin } from "@/components/solo-admin";
import { GestionTipos } from "@/components/gestion-tipos";

export const metadata: Metadata = { title: "Tipos de mantenimiento" };

/** Solo administradores. El corte real lo hace el backend con @Roles(ADMIN). */
export default function Pagina() {
  return (
    <SoloAdmin>
      <GestionTipos />
    </SoloAdmin>
  );
}

import type { Metadata } from "next";

import { SoloAdmin } from "@/components/solo-admin";
import { GestionEquipos } from "@/components/gestion-equipos";

export const metadata: Metadata = { title: "Equipos" };

/** Solo administradores. El corte real lo hace el backend con @Roles(ADMIN). */
export default function Pagina() {
  return (
    <SoloAdmin>
      <GestionEquipos />
    </SoloAdmin>
  );
}

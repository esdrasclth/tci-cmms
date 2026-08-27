import type { Metadata } from "next";

import { SoloAdmin } from "@/components/solo-admin";
import { GestionClientes } from "@/components/gestion-clientes";

export const metadata: Metadata = { title: "Clientes" };

/** Solo administradores. El corte real lo hace el backend con @Roles(ADMIN). */
export default function Pagina() {
  return (
    <SoloAdmin>
      <GestionClientes />
    </SoloAdmin>
  );
}

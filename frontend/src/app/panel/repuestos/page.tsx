import type { Metadata } from "next";

import { SoloAdmin } from "@/components/solo-admin";
import { GestionRepuestos } from "@/components/gestion-repuestos";

export const metadata: Metadata = { title: "Repuestos" };

/**
 * TCI-45 — catalogo de repuestos y existencias de almacen.
 *
 * Solo administradores. El corte real lo hace el backend con @Roles(ADMIN);
 * esto solo evita mostrar una pantalla que respondera 403 entera.
 */
export default function Pagina() {
  return (
    <SoloAdmin>
      <GestionRepuestos />
    </SoloAdmin>
  );
}

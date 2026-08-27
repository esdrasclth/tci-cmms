import type { Metadata } from "next";

import { SoloAdmin } from "@/components/solo-admin";
import { TableroReportes } from "@/components/tablero-reportes";

export const metadata: Metadata = { title: "Reportes" };

/**
 * TCI-58 y TCI-60 — reportes e indicadores.
 *
 * Solo administradores: son las preguntas de la gerencia sobre el trabajo del
 * equipo. El corte real lo hace el backend con @Roles(ADMIN).
 */
export default function Pagina() {
  return (
    <SoloAdmin>
      <TableroReportes />
    </SoloAdmin>
  );
}

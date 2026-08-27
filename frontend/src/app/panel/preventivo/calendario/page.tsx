import type { Metadata } from "next";

import { SoloAdmin } from "@/components/solo-admin";
import { CalendarioPreventivo } from "@/components/calendario-preventivo";

export const metadata: Metadata = { title: "Calendario preventivo" };

/** TCI-51 — calendario de mantenimientos preventivos. Solo administradores. */
export default function Pagina() {
  return (
    <SoloAdmin>
      <CalendarioPreventivo />
    </SoloAdmin>
  );
}

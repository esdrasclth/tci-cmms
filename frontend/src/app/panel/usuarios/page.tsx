import type { Metadata } from "next";

import { SoloAdmin } from "@/components/solo-admin";
import { GestionUsuarios } from "@/components/gestion-usuarios";

export const metadata: Metadata = { title: "Usuarios" };

/**
 * TCI-35 — gestion de usuarios. Solo para administradores.
 *
 * El corte real lo hace el backend (todos los endpoints de /api/usuarios exigen
 * ADMIN); esto solo evita mostrar una pantalla que fallaria entera.
 */
export default function Pagina() {
  return (
    <SoloAdmin>
      <GestionUsuarios />
    </SoloAdmin>
  );
}

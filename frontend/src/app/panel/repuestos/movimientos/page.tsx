import type { Metadata } from "next";

import { SoloAdmin } from "@/components/solo-admin";
import { LibroInventario } from "@/components/libro-inventario";

export const metadata: Metadata = { title: "Movimientos de almacén" };

/**
 * TCI-48 — historial de movimientos de almacen. Solo administradores: es
 * informacion de compras y control, no de campo.
 */
export default function Pagina() {
  return (
    <SoloAdmin>
      <LibroInventario />
    </SoloAdmin>
  );
}

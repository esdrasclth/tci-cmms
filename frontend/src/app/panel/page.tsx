import type { Metadata } from "next";

import { PanelOrdenes } from "@/components/panel-ordenes";

/**
 * El titulo no distingue admin de tecnico —seria "Ordenes" contra "Mis
 * ordenes"— porque la pestana la lee quien tiene quince abiertas, y ahi lo que
 * importa es reconocer la seccion, no de quien son.
 */
export const metadata: Metadata = { title: "Órdenes de trabajo" };

export default function Pagina() {
  return <PanelOrdenes />;
}

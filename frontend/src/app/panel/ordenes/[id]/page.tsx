import { DetalleOrden } from "@/components/detalle-orden";

export const metadata = { title: "Orden de trabajo" };

/**
 * Detalle de una orden (TCI-42). `params` es asincrono desde Next 15.
 */
export default async function OrdenPage({
  params,
}: PageProps<"/panel/ordenes/[id]">) {
  const { id } = await params;
  return <DetalleOrden id={id} />;
}

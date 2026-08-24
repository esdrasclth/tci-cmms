import { FormularioOrden } from "@/components/formulario-orden";

export const metadata = { title: "Editar orden" };

/** Edicion de orden (TCI-26 en la interfaz). Solo admin: lo corta el backend. */
export default async function EditarOrdenPage({
  params,
}: PageProps<"/panel/ordenes/[id]/editar">) {
  const { id } = await params;
  return <FormularioOrden id={id} />;
}

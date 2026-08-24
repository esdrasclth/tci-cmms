import { DetalleEquipo } from "@/components/detalle-equipo";

export const metadata = { title: "Equipo" };

/**
 * Ficha de un equipo con su historial de ordenes (TCI-38).
 *
 * A diferencia de `/panel/equipos`, que es de administracion, esta pantalla no
 * exige rol: a un tecnico en campo le sirve ver que se le hizo antes a la
 * maquina. El backend acota lo que ve.
 */
export default async function EquipoPage({
  params,
}: PageProps<"/panel/equipos/[id]">) {
  const { id } = await params;
  return <DetalleEquipo id={id} />;
}

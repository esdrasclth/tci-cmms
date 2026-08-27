"use client";

import Link from "next/link";

import { ListaOrdenes } from "@/components/lista-ordenes";
import { EncabezadoPagina, clasesBoton } from "@/components/ui";
import { useSession } from "@/lib/auth-client";

/**
 * Listado de ordenes (TCI-41).
 *
 * La sesion y la navegacion las resuelve src/app/panel/layout.tsx; aqui ya se
 * puede dar por hecho que hay usuario.
 *
 * El encabezado no saluda ni repite el nombre y el rol: desde que la barra
 * lateral los muestra de forma permanente, hacerlo aqui era decir dos veces lo
 * mismo y empujaba el listado —lo que se viene a ver— fuera del primer golpe
 * de vista.
 */
export default function PanelPage() {
  const { data: sesion } = useSession();
  if (!sesion) return null;

  const esAdmin = sesion.user.rol === "ADMIN";

  return (
    <>
      <EncabezadoPagina
        titulo={esAdmin ? "Órdenes de trabajo" : "Mis órdenes"}
        descripcion={
          esAdmin
            ? "Todas las intervenciones registradas, con su estado actual."
            : "Las intervenciones que tiene asignadas ahora mismo."
        }
        acciones={
          <Link href="/panel/ordenes/nueva" className={clasesBoton()}>
            Nueva orden
          </Link>
        }
      />

      <ListaOrdenes esAdmin={esAdmin} />
    </>
  );
}

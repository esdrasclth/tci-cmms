"use client";

import Link from "next/link";

import { ListaOrdenes } from "@/components/lista-ordenes";
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="tci-display text-2xl font-semibold text-tci-negro">
            {esAdmin ? "Órdenes de trabajo" : "Mis órdenes"}
          </h1>
          <p className="mt-1 text-sm text-tci-gris">
            {esAdmin
              ? "Todas las intervenciones registradas, con su estado actual."
              : "Las intervenciones que tiene asignadas ahora mismo."}
          </p>
        </div>
        <Link
          href="/panel/ordenes/nueva"
          className="rounded-lg bg-tci-rojo px-4 py-2.5 text-sm font-semibold text-white hover:bg-tci-rojo-hover"
        >
          Nueva orden
        </Link>
      </div>

      <div className="mt-8">
        <ListaOrdenes esAdmin={esAdmin} />
      </div>
    </>
  );
}

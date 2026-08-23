"use client";

import { ListaOrdenes } from "@/components/lista-ordenes";
import { useSession } from "@/lib/auth-client";

/**
 * Listado de ordenes (TCI-41).
 *
 * La sesion y la cabecera las resuelve src/app/panel/layout.tsx; aqui ya se
 * puede dar por hecho que hay usuario.
 */
export default function PanelPage() {
  const { data: sesion } = useSession();
  if (!sesion) return null;

  const esAdmin = sesion.user.rol === "ADMIN";

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-tci-negro">
          Hola, {sesion.user.name}
        </h1>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            esAdmin ? "bg-tci-rojo text-white" : "bg-tci-borde text-tci-grafito"
          }`}
        >
          {esAdmin ? "Administrador" : "Tecnico"}
        </span>
      </div>
      <p className="mt-1 text-sm text-tci-gris">{sesion.user.email}</p>

      <div className="mt-8">
        <ListaOrdenes esAdmin={esAdmin} />
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";

import { CalendarioOrdenes } from "@/components/calendario-ordenes";
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
 *
 * Vive en un componente y no en la propia pagina para que esta pueda ser de
 * servidor y declarar su titulo de pestana: una pagina de cliente no exporta
 * `metadata`.
 */
export function PanelOrdenes() {
  const { data: sesion } = useSession();
  /**
   * Lista o calendario.
   *
   * Va aqui y no en una seccion aparte porque es la misma informacion vista de
   * otra forma, no otro sitio: separarlas obligaria a recordar en cual de las
   * dos pantallas se estaba buscando una orden.
   *
   * La eleccion no se recuerda entre visitas a proposito. El listado es lo que
   * sirve para trabajar —filtra, ordena y pagina— y el calendario contesta una
   * pregunta puntual: que hay esta semana. Volver siempre al listado es lo que
   * quiere quien entra a buscar una orden concreta, que es casi siempre.
   */
  const [vista, setVista] = useState<"lista" | "calendario">("lista");

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
          <>
            <div
              className="flex rounded-lg border border-tci-borde bg-white p-0.5"
              role="group"
              aria-label="Forma de ver las órdenes"
            >
              {(["lista", "calendario"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVista(v)}
                  aria-pressed={vista === v}
                  className={`h-8 rounded-md px-3 text-sm font-semibold capitalize transition-colors ${
                    vista === v
                      ? "bg-tci-negro text-white"
                      : "text-tci-grafito hover:bg-tci-humo"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <Link href="/panel/ordenes/nueva" className={clasesBoton()}>
              Nueva orden
            </Link>
          </>
        }
      />

      {vista === "lista" ? (
        <ListaOrdenes esAdmin={esAdmin} />
      ) : (
        <CalendarioOrdenes esAdmin={esAdmin} />
      )}
    </>
  );
}

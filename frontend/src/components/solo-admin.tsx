"use client";

import Link from "next/link";

import { Vacio, clasesBoton } from "@/components/ui";
import { useSession } from "@/lib/auth-client";

/**
 * Envoltorio de las secciones reservadas a administradores.
 *
 * Estaba copiado en once pantallas, con dos redacciones distintas y alguna sin
 * tildes. Aparte de la duplicacion, tenerlo dentro de cada `page.tsx` obligaba
 * a que la pagina entera fuese de cliente —hace falta la sesion— y **una
 * pagina de cliente no puede exportar `metadata`**: por eso las quince
 * pestanas del navegador decian todas lo mismo. Con la guarda aqui dentro, las
 * paginas vuelven a ser de servidor y cada una pone su titulo.
 *
 * Esto no es seguridad, es cortesia: el corte real lo hace el backend con
 * `@Roles(ADMIN)`. Aqui solo se evita mostrar una pantalla que responderia 403
 * entera.
 */
export function SoloAdmin({ children }: { children: React.ReactNode }) {
  const { data: sesion } = useSession();

  // Mientras se resuelve la sesion no se pinta nada: mostrar el aviso y
  // retirarlo medio segundo despues se lee como un error que no ocurrio.
  if (!sesion) return null;

  if (sesion.user.rol !== "ADMIN") {
    return (
      <Vacio
        accion={
          <Link
            href="/panel"
            className={clasesBoton({ variante: "secundario" })}
          >
            Volver a mis órdenes
          </Link>
        }
      >
        Esta sección es solo para administradores.
      </Vacio>
    );
  }

  return <>{children}</>;
}

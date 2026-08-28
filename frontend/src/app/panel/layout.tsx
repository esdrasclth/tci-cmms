"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  BarraLateral,
  MenuMovil,
  destinosDe,
} from "@/components/barra-lateral";
import { CampanaNotificaciones } from "@/components/campana-notificaciones";
import { HojaInferior } from "@/components/hoja-inferior";
import { IconoMenu, IconoUsuarios } from "@/components/iconos";
import { signOut, useSession } from "@/lib/auth-client";

/**
 * Marco comun del panel: navegacion lateral y guarda de sesion.
 *
 * La guarda es del lado del cliente a proposito: el backend vive en otro origen
 * y dar por hecho que su cookie llega al servidor de Next solo funciona mientras
 * compartan host. Cuando el despliegue fije los dominios (TCI-70) esto puede
 * pasar a un middleware.
 *
 * En escritorio la navegacion es una columna fija. En movil no se reaprovecha
 * esa columna: se sube a una hoja desde el borde inferior, porque la
 * hamburguesa esta arriba a la izquierda —el punto mas lejano para el pulgar de
 * quien sostiene el telefono con una mano— y en planta esto se usa con guantes
 * (TCI-44). Ver `hoja-inferior.tsx`.
 */
export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  const router = useRouter();
  const ruta = usePathname();
  const { data: sesion, isPending, isRefetching } = useSession();
  const [hojaAbierta, setHojaAbierta] = useState(false);

  /*
   * Segunda linea de defensa contra la misma carrera que arregla el login.
   *
   * `isRefetching` importa tanto como `isPending`: mientras una relectura
   * viaja no se sabe si hay sesion, y rebotar en ese momento es lo que hacia
   * fallar la entrada a la primera. Solo se redirige cuando la respuesta ya
   * llego y dice que no hay nadie.
   */
  useEffect(() => {
    if (!isPending && !isRefetching && !sesion) {
      router.replace("/login");
    }
  }, [isPending, isRefetching, sesion, router]);

  // Solo `!sesion`: con sesion en mano el panel se pinta aunque haya una
  // relectura de fondo en curso. Incluir `isRefetching` aqui reemplazaria toda
  // la pantalla por "Cargando..." cada vez que la sesion se refresca sola.
  if (!sesion) {
    return (
      <main className="grid min-h-dvh place-items-center bg-tci-humo">
        <p className="text-sm text-tci-gris">Cargando...</p>
      </main>
    );
  }

  const esAdmin = sesion.user.rol === "ADMIN";
  const destinos = destinosDe(esAdmin);
  // El tecnico solo tiene un destino, asi que no hay menu que abrir.
  const hayNavegacion = destinos.length > 1;
  const usuario = {
    nombre: sesion.user.name,
    correo: sesion.user.email,
    esAdmin,
  };

  async function salir() {
    await signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-dvh bg-tci-humo">
      {/* Escritorio: columna fija. `fixed` y no una celda de rejilla para que
          la barra no se desplace al hacer scroll en listados largos. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <BarraLateral
          destinos={destinos}
          ruta={ruta}
          usuario={usuario}
          onSalir={() => void salir()}
        />
      </aside>

      {/* Movil: barra superior minima. La campana va aqui y no dentro del
          menu: es lo unico que puede llegar mientras se trabaja, y no debe
          costar un toque de mas. */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 bg-tci-negro px-4 py-2 lg:hidden">
        <Link href="/panel" aria-label="Ir al listado de ordenes">
          <Image
            src="/logo-tci.png"
            alt="TCI"
            width={4586}
            height={1335}
            priority
            className="h-10 w-auto"
          />
        </Link>
        <div className="flex items-center gap-1">
          <CampanaNotificaciones compacto />
          <button
            type="button"
            onClick={() => setHojaAbierta(true)}
            aria-expanded={hojaAbierta}
            aria-haspopup="dialog"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-white/80 transition-colors active:bg-white/10"
          >
            {/* Con un solo destino no hay nada que navegar: el boton deja de
                ser un menu y pasa a ser el acceso a la cuenta. */}
            <span className="sr-only">
              {hayNavegacion ? "Abrir menú" : "Su cuenta"}
            </span>
            {hayNavegacion ? (
              <IconoMenu />
            ) : (
              <IconoUsuarios className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      <HojaInferior
        abierta={hojaAbierta}
        onCerrar={() => setHojaAbierta(false)}
        etiqueta={hayNavegacion ? "Menú" : "Su cuenta"}
      >
        <MenuMovil
          destinos={destinos}
          ruta={ruta}
          usuario={usuario}
          onSalir={() => void salir()}
          onNavegar={() => setHojaAbierta(false)}
        />
      </HojaInferior>

      <div className="lg:pl-64">
        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

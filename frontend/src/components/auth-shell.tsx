import Image from "next/image";

import type { ReactNode } from "react";

/**
 * Pantalla partida de autenticacion (TCI-40).
 *
 * Estructura tomada de branding/idea-login.jpg: fondo a sangre con la marca y
 * el mensaje a la izquierda, y una tarjeta blanca flotando a la derecha con el
 * formulario.
 *
 * En movil no hay espacio para las dos columnas: el fondo oscuro se conserva
 * (el logo de TCI es blanco y rojo, y sobre blanco seria invisible) y la
 * tarjeta pasa a ocupar el ancho completo debajo del logo.
 */
export function AuthShell({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-dvh bg-tci-negro">
      <FondoLogin />

      <div className="relative flex min-h-dvh flex-col lg:flex-row">
        {/* Columna de marca */}
        {/* Igual que la barra del panel: instalada, la pagina pasa por debajo
            de la barra de estado y el logotipo quedaria tapado. */}
        <div className="flex flex-col justify-between gap-10 px-6 pt-[calc(2rem+env(safe-area-inset-top))] pb-4 lg:w-[54%] lg:px-12 lg:pt-10 lg:pb-14">
          <div className="flex items-center justify-between gap-4">
            <Logo />
            <a
              href="https://www.tcihn.com"
              className="hidden shrink-0 text-sm font-medium text-white/75 transition-colors hover:text-white lg:inline"
            >
              &larr; Volver al sitio
            </a>
          </div>

          {/* El mensaje solo cabe en escritorio; en movil estorbaria al formulario. */}
          <div className="hidden max-w-xl lg:block">
            <span className="mb-6 block h-1 w-16 bg-tci-rojo" />
            <h1 className="tci-display text-4xl font-semibold text-white xl:text-5xl">
              Cada orden de trabajo,
              <br />
              bajo control.
            </h1>
            <p className="mt-6 max-w-md text-[0.9375rem] leading-7 text-white/75">
              Planifique, asigne y dé seguimiento a cada intervención, desde la
              oficina o desde la planta. El historial completo de sus equipos,
              siempre a la mano.
            </p>
          </div>
        </div>

        {/* Tarjeta del formulario */}
        <div className="flex flex-1 items-center px-4 pb-6 lg:my-4 lg:mr-4 lg:ml-0 lg:px-0 lg:pb-0">
          <div className="w-full rounded-2xl bg-white p-7 shadow-2xl sm:p-10 lg:flex lg:h-full lg:items-center lg:p-12">
            <div className="mx-auto w-full max-w-md">
              <h2 className="tci-display text-[2rem] font-semibold text-tci-negro">
                {titulo}
              </h2>
              <p className="mt-2 text-[0.9375rem] leading-6 text-tci-gris">
                {subtitulo}
              </p>

              <div className="mt-8">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <Image
      src="/logo-tci.png"
      alt="TCI — Tecnicos de Control Industrial"
      width={4586}
      height={1335}
      priority
      // El logotipo son trazos muy finos: por debajo de ~48px de alto la
      // palabra "TCI" se adelgaza hasta desaparecer sobre el fondo oscuro.
      className="h-12 w-auto lg:h-14"
    />
  );
}

/** Fondo de marca con una capa oscura que mantiene legible el contenido. */
function FondoLogin() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/*
        Dos imagenes, no una.
        
        El original pesaba 649 KB y se descargaba igual en un telefono, por CSS
        —asi que Next no lo optimizaba— para acabar tapado por un velo negro al
        55%. En WebP y al ancho que cada pantalla necesita son 40 KB en movil y
        117 en escritorio. Es la pantalla de acceso: la primera impresion del
        sistema y, en campo, con datos moviles.

        Se resuelve con dos divs y no con `image-set()` porque asi la eleccion
        la hace el mismo sistema de puntos de corte que el resto de la interfaz.
      */}
      <div
        className="absolute inset-0 bg-cover bg-center lg:hidden"
        style={{ backgroundImage: "url('/fondo-movil.webp')" }}
      />
      <div
        className="absolute inset-0 hidden bg-cover bg-center lg:block"
        style={{ backgroundImage: "url('/fondo.webp')" }}
      />
      <div className="absolute inset-0 bg-tci-negro/55" />
    </div>
  );
}

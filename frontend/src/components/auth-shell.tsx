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
    <div className="relative min-h-screen bg-tci-negro">
      <FondoFacetado />

      <div className="relative flex min-h-screen flex-col lg:flex-row">
        {/* Columna de marca */}
        <div className="flex flex-col justify-between gap-10 px-6 pt-8 pb-4 lg:w-[54%] lg:px-12 lg:pt-10 lg:pb-14">
          <div className="flex items-center justify-between gap-4">
            <Logo />
            <a
              href="https://www.tcihn.com"
              className="hidden shrink-0 text-sm text-white/70 transition-colors hover:text-white lg:inline"
            >
              &larr; Volver al sitio
            </a>
          </div>

          {/* El mensaje solo cabe en escritorio; en movil estorbaria al formulario. */}
          <div className="hidden max-w-xl lg:block">
            <span className="mb-6 block h-1 w-16 bg-tci-rojo" />
            <h1 className="text-4xl leading-tight font-bold text-white xl:text-5xl">
              Cada orden de trabajo,
              <br />
              bajo control.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/60">
              Registre, asigne y cierre mantenimientos preventivos y correctivos.
              Con historial completo por equipo y por tecnico.
            </p>
          </div>
        </div>

        {/* Tarjeta del formulario */}
        <div className="flex flex-1 items-center px-4 pb-6 lg:my-4 lg:mr-4 lg:ml-0 lg:px-0 lg:pb-0">
          <div className="w-full rounded-2xl bg-white p-7 shadow-2xl sm:p-10 lg:flex lg:h-full lg:items-center lg:p-12">
            <div className="mx-auto w-full max-w-md">
              <h2 className="text-3xl font-bold tracking-tight text-tci-negro">
                {titulo}
              </h2>
              <p className="mt-2 text-sm text-tci-gris">{subtitulo}</p>

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

/**
 * Fondo geometrico en lugar de una fotografia: el repositorio no tiene banco de
 * imagenes propio y una foto de archivo desentonaria con la marca. Las facetas
 * evocan el plano industrial del logo.
 */
function FondoFacetado() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        className="h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1200 800"
      >
        <defs>
          <linearGradient id="base" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="55%" stopColor="#0d0d0d" />
            <stop offset="100%" stopColor="#000000" />
          </linearGradient>
          {/* Acento de marca, no protagonista: por encima de ~0.2 el rojo
              inunda el panel y el arco rojo del logo pierde contraste. */}
          <radialGradient id="brasa" cx="12%" cy="92%" r="52%">
            <stop offset="0%" stopColor="#c61d1a" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#c61d1a" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1200" height="800" fill="url(#base)" />

        <g fill="#ffffff" fillOpacity="0.028">
          <polygon points="0,300 380,140 520,470 210,660" />
          <polygon points="380,140 760,0 900,300 520,470" />
          <polygon points="520,470 900,300 1010,640 700,800" />
          <polygon points="900,300 1200,190 1200,540 1010,640" />
          <polygon points="0,660 210,660 320,800 0,800" />
        </g>
        <g stroke="#ffffff" strokeOpacity="0.07" strokeWidth="1" fill="none">
          <polygon points="0,300 380,140 520,470 210,660" />
          <polygon points="380,140 760,0 900,300 520,470" />
          <polygon points="520,470 900,300 1010,640 700,800" />
          <polygon points="900,300 1200,190 1200,540 1010,640" />
        </g>

        <rect width="1200" height="800" fill="url(#brasa)" />
      </svg>
    </div>
  );
}

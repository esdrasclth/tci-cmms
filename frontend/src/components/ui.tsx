"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Primitivas de interfaz del panel.
 *
 * Nacen de un problema medido: el boton primario rojo existia en cinco alturas
 * distintas (py-1.5, py-2, py-2.5, py-3, py-3.5) y dos pesos tipograficos,
 * repartido en 12 variantes escritas a mano por las pantallas. Nada alineaba
 * con nada, y por eso el panel se leia desordenado aunque cada pantalla por
 * separado estuviera bien.
 *
 * Dos decisiones sostienen el arreglo:
 *
 * 1. **Altura explicita, no padding.** Un `h-9` siempre mide 36px; un
 *    `py-2 text-sm` mide lo que le toque segun el interlineado heredado. Fijar
 *    la altura es lo que garantiza que un boton junto a un campo alineen
 *    aunque uno tenga icono y el otro no.
 *
 * 2. **Dos alturas por control, no una.** En movil los controles miden 44px
 *    (el minimo tactil recomendado) y en escritorio bajan a 36px. Un tecnico
 *    en campo usa esto con guantes sobre un telefono; un administrador lo mira
 *    todo el dia en pantalla grande buscando una orden entre cincuenta. La
 *    misma altura no puede servir a los dos (TCI-44).
 */

/**
 * Alturas de control. `md` es la de por defecto y la que usan los campos.
 *
 * `xs` es para acciones dentro de filas de tabla, donde el boton no es el
 * protagonista y crecerlo engorda cada fila del listado. Solo aparece en la
 * tabla de escritorio: en movil esas mismas acciones se dibujan como tarjeta y
 * usan `sm`, que si respeta el minimo tactil.
 */
const ALTURAS = {
  xs: "h-8 px-2.5 text-xs md:h-7",
  sm: "h-9 px-3 text-xs md:h-8",
  md: "h-11 px-3.5 text-sm md:h-9",
  lg: "h-12 px-4 text-sm",
} as const;

const VARIANTES = {
  primario:
    "bg-tci-rojo text-white hover:bg-tci-rojo-hover disabled:hover:bg-tci-rojo",
  secundario:
    "border border-tci-borde bg-white text-tci-negro hover:bg-tci-humo disabled:hover:bg-white",
  // Sin borde: para acciones dentro de filas y barras de herramientas, donde
  // un borde por accion convierte la tabla en una reja.
  fantasma:
    "text-tci-grafito hover:bg-tci-humo hover:text-tci-negro disabled:hover:bg-transparent",
  // La marca ya es roja, asi que un destructivo en rojo solido competiria con
  // el primario. Va en contorno: se lee como peligro sin gritar mas que la
  // accion principal de la pantalla.
  peligro:
    "border border-tci-rojo/35 bg-white text-tci-rojo hover:bg-tci-rojo/5 disabled:hover:bg-white",
} as const;

const BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold " +
  "whitespace-nowrap transition-colors " +
  "disabled:cursor-not-allowed disabled:opacity-55";

/**
 * Las clases sueltas, para los `<Link>` de Next que tienen aspecto de boton.
 * Un `<Boton>` polimorfico con `as` daria tipos peores por poco a cambio: lo
 * que importa es que el estilo salga de un solo sitio, y asi sale.
 */
export function clasesBoton({
  variante = "primario",
  tamano = "md",
  className = "",
}: {
  variante?: keyof typeof VARIANTES;
  tamano?: keyof typeof ALTURAS;
  className?: string;
} = {}) {
  return `${BASE} ${ALTURAS[tamano]} ${VARIANTES[variante]} ${className}`;
}

/**
 * Clases para los `<input>` y `<select>` sueltos de las barras de filtro, que
 * no llevan etiqueta visible y por tanto no pasan por `Campo`. Comparten la
 * altura de `Boton` del mismo tamano: es lo que hace que una barra de "buscar +
 * filtro + boton" quede a ras en vez de escalonada.
 */
export function clasesControl(className = "") {
  return (
    "rounded-lg border border-tci-borde bg-white text-tci-negro " +
    "placeholder:text-tci-gris/70 transition-colors " +
    "hover:border-tci-gris/60 focus:border-tci-rojo focus:outline-none " +
    "disabled:cursor-not-allowed disabled:bg-tci-humo " +
    `${ALTURAS.md} ${className}`
  );
}

type BotonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: keyof typeof VARIANTES;
  tamano?: keyof typeof ALTURAS;
  cargando?: boolean;
  children: ReactNode;
};

export function Boton({
  variante = "primario",
  tamano = "md",
  cargando = false,
  className = "",
  children,
  ...props
}: BotonProps) {
  return (
    <button
      {...props}
      disabled={cargando || props.disabled}
      aria-busy={cargando || undefined}
      className={clasesBoton({ variante, tamano, className })}
    >
      {cargando && <Girador />}
      {children}
    </button>
  );
}

/**
 * Encabezado de pantalla: titulo, texto de apoyo y acciones.
 *
 * Existia en cinco formas distintas (dos alineaciones, dos pesos de titulo, tres
 * separaciones), asi que al navegar entre secciones el titulo cambiaba de sitio
 * y de grosor. Unificado aqui, la cabecera deja de moverse entre pantallas.
 *
 * `items-start` y no `items-center`: cuando hay descripcion, centrar respecto al
 * bloque completo deja las acciones flotando a media altura del parrafo.
 */
export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
  volver,
  encima,
}: {
  /** `ReactNode` y no `string`: las fichas cuelgan una etiqueta del titulo. */
  titulo: ReactNode;
  descripcion?: ReactNode;
  acciones?: ReactNode;
  /** Enlace de vuelta, para las pantallas de ficha y de formulario. */
  volver?: { href: string; texto: string };
  /** Sobretitulo: el codigo del equipo, el numero de la orden. */
  encima?: ReactNode;
}) {
  return (
    <div className="mb-6">
      {volver && (
        <Link
          href={volver.href}
          className="text-sm text-tci-gris underline-offset-2 transition-colors hover:text-tci-rojo hover:underline"
        >
          &larr; {volver.texto}
        </Link>
      )}
      <div
        className={`flex flex-wrap items-start justify-between gap-x-4 gap-y-3 ${volver ? "mt-3" : ""}`}
      >
        <div className="min-w-0">
          {encima && (
            <p className="font-mono text-xs text-tci-gris">{encima}</p>
          )}
          <h1 className="tci-display text-2xl font-semibold text-tci-negro">
            {titulo}
          </h1>
          {descripcion && (
            <p className="mt-1 text-sm text-tci-gris">{descripcion}</p>
          )}
        </div>
        {acciones && (
          <div className="flex flex-wrap items-center gap-2">{acciones}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Contenedor blanco estandar. El padding vivia en tres valores (p-4, p-5, p-8)
 * sin criterio que los separara; `p-5` en escritorio es el punto donde la
 * tarjeta respira sin desperdiciar alto de pantalla.
 */
export function Tarjeta({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-tci-borde bg-white p-4 sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Estado vacio. Se repetia casi identico en 23 sitios, con dos redacciones y
 * dos paddings distintos.
 */
export function Vacio({
  children,
  accion,
}: {
  children: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-tci-borde bg-white p-8 text-center">
      <p className="text-sm text-tci-grafito">{children}</p>
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}

export function Girador() {
  return (
    <svg
      className="h-4 w-4 shrink-0 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="3"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

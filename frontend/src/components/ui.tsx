"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import {
  ALTURAS,
  VARIANTES,
  clasesBoton as construirClases,
} from "@/components/estilos";

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

export { clasesArea, clasesBoton, clasesControl } from "@/components/estilos";

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
      className={construirClases({ variante, tamano, className })}
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
    <div className="mb-5 sm:mb-6">
      {volver && (
        <Link
          href={volver.href}
          className="text-sm text-tci-gris underline-offset-2 transition-colors hover:text-tci-rojo hover:underline"
        >
          &larr; {volver.texto}
        </Link>
      )}
      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-x-4 ${volver ? "mt-3" : ""}`}
      >
        <div className="min-w-0">
          {encima && (
            <p className="font-mono text-xs text-tci-gris">{encima}</p>
          )}
          {/* 20px en movil, 24 desde `sm`. En un telefono el titulo compite
              con los datos por un alto que no sobra, y la seccion ya se sabe
              por donde se entro. En escritorio recupera su tamano. */}
          <h1 className="tci-display text-xl font-semibold text-tci-negro sm:text-2xl">
            {titulo}
          </h1>
          {descripcion && (
            <p className="mt-1 text-sm text-tci-gris">{descripcion}</p>
          )}
        </div>
        {/* En movil las acciones bajan SIEMPRE a su propia linea. Con
            `flex-wrap` bajaban solo cuando el titulo era largo, asi que el
            boton cambiaba de sitio entre pantallas: justo el salto que se
            queria quitar. */}
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
    <div className="rounded-xl border border-dashed border-tci-borde bg-white p-6 text-center sm:p-8">
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

/**
 * Controles de pagina. Vivian dentro de `lista-ordenes`, que era el unico
 * listado paginado; ahora lo son tambien clientes, equipos y repuestos.
 *
 * Muestra el total y no solo "pagina 2 de 7": saber que hay 1.243 clientes es
 * la mitad de la informacion que se busca al abrir la pantalla.
 */
export function Paginacion({
  meta,
  onCambiar,
  deshabilitado = false,
  nombre,
}: {
  meta: { total: number; page: number; totalPages: number };
  onCambiar: (n: number) => void;
  deshabilitado?: boolean;
  /** Plural de lo que se lista: "clientes", "equipos". */
  nombre: string;
}) {
  const { page, totalPages, total } = meta;
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <Boton
        tamano="sm"
        variante="secundario"
        onClick={() => onCambiar(page - 1)}
        disabled={deshabilitado || page <= 1}
      >
        Anterior
      </Boton>
      <span className="text-sm text-tci-gris">
        Pagina {page} de {totalPages} · {total} {nombre}
      </span>
      <Boton
        tamano="sm"
        variante="secundario"
        onClick={() => onCambiar(page + 1)}
        disabled={deshabilitado || page >= totalPages}
      >
        Siguiente
      </Boton>
    </div>
  );
}

/**
 * Insignia de estado o etiqueta.
 *
 * Altura fija, por el mismo motivo que los botones: varias insignias juntas
 * tienen que alinear aunque una lleve punto y otra no. Antes el estado y la
 * prioridad se apilaban en columna con formas distintas —una pastilla y un
 * texto suelto— y se leian como dos cosas sin relacion en vez de como el
 * estado de una misma orden.
 */
export function Insignia({
  tono = "bg-tci-humo text-tci-grafito",
  punto,
  children,
}: {
  /** Clases de fondo y texto. Vienen de los mapas de color del dominio. */
  tono?: string;
  /** Clase de fondo del punto. Sin el, la insignia va sin punto. */
  punto?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold whitespace-nowrap ${tono}`}
    >
      {punto && (
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${punto}`} />
      )}
      {children}
    </span>
  );
}

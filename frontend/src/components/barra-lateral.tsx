"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { CampanaNotificaciones } from "@/components/campana-notificaciones";
import {
  IconoClientes,
  IconoEquipos,
  IconoCampana,
  IconoOrdenes,
  IconoPreventivo,
  IconoReportes,
  IconoRepuestos,
  IconoSalir,
  IconoTipos,
  IconoUsuarios,
} from "@/components/iconos";

/**
 * Navegacion del panel, en columna a la izquierda.
 *
 * En horizontal los cinco destinos competian con el logotipo por el ancho y
 * habia que abreviarlos ("Tipos"); en vertical caben con su nombre completo y
 * queda sitio para el icono, que es lo que permite reconocer la seccion sin
 * leer. El ancho fijo tambien estabiliza el area de contenido: al cambiar de
 * pantalla, la columna de trabajo no se mueve.
 *
 * El fondo se mantiene negro porque el logotipo de TCI es blanco y rojo sobre
 * transparente: sobre claro desaparece.
 */

export type Destino = {
  href: string;
  etiqueta: string;
  icono: (props: { className?: string }) => ReactNode;
  /** `/panel` casa exacto; el resto por prefijo, para que el detalle marque su seccion. */
  exacto?: boolean;
};

const DESTINOS_ADMIN: Destino[] = [
  { href: "/panel", etiqueta: "Órdenes", icono: IconoOrdenes, exacto: true },
  { href: "/panel/clientes", etiqueta: "Clientes", icono: IconoClientes },
  { href: "/panel/equipos", etiqueta: "Equipos", icono: IconoEquipos },
  { href: "/panel/repuestos", etiqueta: "Repuestos", icono: IconoRepuestos },
  {
    href: "/panel/tipos-mantenimiento",
    etiqueta: "Tipos de mantenimiento",
    icono: IconoTipos,
  },
  {
    href: "/panel/preventivo",
    etiqueta: "Preventivo",
    icono: IconoPreventivo,
  },
  { href: "/panel/reportes", etiqueta: "Reportes", icono: IconoReportes },
  { href: "/panel/usuarios", etiqueta: "Usuarios", icono: IconoUsuarios },
  {
    href: "/panel/notificaciones",
    etiqueta: "Notificaciones",
    icono: IconoCampana,
  },
];

/**
 * El tecnico solo alcanza el listado y el detalle de sus ordenes. Se le deja
 * igualmente el destino: da contexto de donde esta y mantiene una sola forma
 * de volver al listado desde el detalle.
 */
const DESTINOS_TECNICO: Destino[] = [
  { href: "/panel", etiqueta: "Mis órdenes", icono: IconoOrdenes, exacto: true },
];

export function destinosDe(esAdmin: boolean): Destino[] {
  return esAdmin ? DESTINOS_ADMIN : DESTINOS_TECNICO;
}

export function BarraLateral({
  destinos,
  ruta,
  usuario,
  onSalir,
  onNavegar,
}: {
  destinos: Destino[];
  ruta: string;
  usuario: { nombre: string; correo: string; esAdmin: boolean };
  onSalir: () => void;
  /** Cierra el cajon en movil. En escritorio no se pasa: no hay nada que cerrar. */
  onNavegar?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-tci-negro">
      <div className="px-5 py-6">
        <Link
          href="/panel"
          onClick={onNavegar}
          aria-label="Ir al listado de ordenes"
          className="inline-block"
        >
          <Image
            src="/logo-tci.png"
            alt="TCI"
            width={4586}
            height={1335}
            priority
            // Por debajo de ~40px de alto el subtitulo del logotipo se empasta
            // y deja de leerse.
            className="h-10 w-auto"
          />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label="Secciones del panel">
        {destinos.map((destino) => {
          const activo = destino.exacto
            ? ruta === destino.href
            : ruta.startsWith(destino.href);
          const Icono = destino.icono;
          return (
            <Link
              key={destino.href}
              href={destino.href}
              onClick={onNavegar}
              aria-current={activo ? "page" : undefined}
              // min-h-11: por debajo de ~44px se falla el objetivo tactil con
              // guantes puestos, que es como se usa esto en planta.
              className={`relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
                activo
                  ? "bg-white/10 font-semibold text-white"
                  : "text-white/65 hover:bg-white/5 hover:text-white"
              }`}
            >
              {/* El rojo entra como marca grafica, no como color de texto:
                  sobre negro da 3.6:1 y no llegaria a AA. */}
              {activo && (
                <span
                  aria-hidden
                  className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-tci-rojo"
                />
              )}
              <Icono className="h-5 w-5" />
              {destino.etiqueta}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        {/* TCI-53. Encima del bloque de usuario y no en la cabecera: aqui esta
            en la misma columna que la navegacion y se ve desde cualquier
            pantalla, tambien con el cajon abierto en movil. */}
        <CampanaNotificaciones />

        <div className="px-2 py-2">
          <p className="truncate text-sm font-semibold text-white">
            {usuario.nombre}
          </p>
          <p className="truncate text-xs text-white/50">{usuario.correo}</p>
          <p className="mt-1.5 text-[0.6875rem] font-semibold tracking-wide text-white/40 uppercase">
            {usuario.esAdmin ? "Administrador" : "Técnico"}
          </p>
        </div>
        <button
          type="button"
          onClick={onSalir}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-white/65 transition-colors hover:bg-white/5 hover:text-white"
        >
          <IconoSalir className="h-5 w-5" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

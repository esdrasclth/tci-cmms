/**
 * Juego de iconos de la interfaz.
 *
 * Son de trazo, no de relleno: un contorno de 1.75px a 24px hereda el peso de
 * la tipografia y el `currentColor` del texto que acompana, asi que un icono
 * junto a una etiqueta pesa lo mismo que ella. Los iconos macizos —los de las
 * barras de sistema de Android o iOS— se leen como un segundo nivel de jerarquia
 * y competirian con el rojo institucional, que es el unico acento de color de
 * la aplicacion.
 *
 * Todos comparten rejilla de 24 y el mismo contorno, de modo que se pueden
 * intercambiar sin retocar el espaciado. Ninguno lleva `title`: acompanan a una
 * etiqueta visible, por lo que van marcados `aria-hidden` desde `Icono`.
 */

type Props = {
  /** Alto y ancho en `rem`, via clases de utilidad. Por defecto 20px. */
  className?: string;
};

function Icono({
  className = "h-5 w-5",
  children,
}: Props & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={`${className} shrink-0`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** Ordenes de trabajo: un portapapeles con renglones. */
export function IconoOrdenes(props: Props) {
  return (
    <Icono {...props}>
      <path d="M9 4.5H7.5A1.5 1.5 0 0 0 6 6v13a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V6a1.5 1.5 0 0 0-1.5-1.5H15" />
      <rect x="9" y="2.75" width="6" height="3.25" rx="1.1" />
      <path d="M9 11.5h6M9 15.5h3.5" />
    </Icono>
  );
}

/** Clientes: el edificio de la empresa atendida, con su anexo. */
export function IconoClientes(props: Props) {
  return (
    <Icono {...props}>
      <path d="M3.5 20.5h17" />
      <path d="M6 20.5V5.5A1.5 1.5 0 0 1 7.5 4h6A1.5 1.5 0 0 1 15 5.5v15" />
      <path d="M15 10.5h2.5A1.5 1.5 0 0 1 19 12v8.5" />
      <path d="M9 8h3M9 11.5h3M9 15h3" />
    </Icono>
  );
}

/** Equipos: el chip, que lee como "activo" sin recurrir a un engranaje. */
export function IconoEquipos(props: Props) {
  return (
    <Icono {...props}>
      <rect x="5" y="5" width="14" height="14" rx="2.5" />
      <rect x="9.75" y="9.75" width="4.5" height="4.5" rx="1" />
      <path d="M9 2.75V5M15 2.75V5M9 19v2.25M15 19v2.25M2.75 9H5M2.75 15H5M19 9h2.25M19 15h2.25" />
    </Icono>
  );
}

/** Tipos de mantenimiento: la etiqueta del catalogo. */
export function IconoTipos(props: Props) {
  return (
    <Icono {...props}>
      <path d="M11.9 3.5H5.5a2 2 0 0 0-2 2v6.4a2 2 0 0 0 .59 1.41l7.6 7.6a2 2 0 0 0 2.82 0l6.4-6.4a2 2 0 0 0 0-2.82l-7.6-7.6a2 2 0 0 0-1.41-.59Z" />
      <path d="M7.75 7.75h.01" />
    </Icono>
  );
}

/** Repuestos: la tuerca, que es la pieza de almacen mas reconocible. */
export function IconoRepuestos(props: Props) {
  return (
    <Icono {...props}>
      <path d="M11.13 2.9a1.75 1.75 0 0 1 1.74 0l6 3.46c.54.31.88.89.88 1.51v6.92c0 .62-.34 1.2-.88 1.51l-6 3.46a1.75 1.75 0 0 1-1.74 0l-6-3.46a1.75 1.75 0 0 1-.88-1.51V7.87c0-.62.34-1.2.88-1.51l6-3.46Z" />
      <circle cx="12" cy="11.83" r="3.25" />
    </Icono>
  );
}

/** Usuarios del sistema. */
export function IconoUsuarios(props: Props) {
  return (
    <Icono {...props}>
      <path d="M15.5 20.5v-1.75a4 4 0 0 0-4-4h-4a4 4 0 0 0-4 4v1.75" />
      <circle cx="9.5" cy="7.75" r="3.25" />
      <path d="M20.5 20.5v-1.75a4 4 0 0 0-3-3.87" />
      <path d="M15.5 4.63a4 4 0 0 1 0 6.24" />
    </Icono>
  );
}

/** Preventivo: el calendario, que es lo que ordena un plan. */
export function IconoPreventivo(props: Props) {
  return (
    <Icono {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.75h17" />
      <path d="M8.25 3v4M15.75 3v4" />
      <path d="M8 14h.01M12 14h.01M16 14h.01" />
    </Icono>
  );
}

/** Reportes: las barras del tablero. */
export function IconoReportes(props: Props) {
  return (
    <Icono {...props}>
      <path d="M3.5 20.5h17" />
      <path d="M7 20.5v-6M12 20.5V7M17 20.5v-9" />
    </Icono>
  );
}

/** Notificaciones: la campana. */
export function IconoCampana(props: Props) {
  return (
    <Icono {...props}>
      <path d="M18 8.5a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5" />
      <path d="M13.75 19.5a2 2 0 0 1-3.5 0" />
    </Icono>
  );
}

/** Cerrar sesion: la flecha que sale del marco. */
export function IconoSalir(props: Props) {
  return (
    <Icono {...props}>
      <path d="M9.5 20.5H6.5A2 2 0 0 1 4.5 18.5v-13A2 2 0 0 1 6.5 3.5h3" />
      <path d="M15 16.5 19.5 12 15 7.5" />
      <path d="M19.5 12h-11" />
    </Icono>
  );
}

export function IconoMenu(props: Props) {
  return (
    <Icono {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Icono>
  );
}

export function IconoCerrar(props: Props) {
  return (
    <Icono {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icono>
  );
}

/* --- Acciones de fila ------------------------------------------------------
 *
 * A diferencia de los de navegacion, estos van SOLOS dentro del boton, sin
 * etiqueta al lado. Siguen marcados `aria-hidden`: el nombre accesible lo pone
 * el `aria-label` del boton, no el icono. Un `<title>` dentro del svg daria dos
 * nombres para el mismo control.
 */

export function IconoEditar(props: Props) {
  return (
    <Icono {...props}>
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="M14.5 7.5l3 3" />
    </Icono>
  );
}

export function IconoBorrar(props: Props) {
  return (
    <Icono {...props}>
      <path d="M3.5 6h17" />
      <path d="M8.5 6V4.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1V6" />
      <path d="M18.5 6l-.8 13a2 2 0 0 1-2 1.9H8.3a2 2 0 0 1-2-1.9L5.5 6" />
      <path d="M10 10.5v6M14 10.5v6" />
    </Icono>
  );
}

/** Estado activo: se puede desactivar. */
export function IconoDesactivar(props: Props) {
  return (
    <Icono {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6 6l12 12" />
    </Icono>
  );
}

/** Estado desactivado: se puede volver a activar. */
export function IconoActivar(props: Props) {
  return (
    <Icono {...props}>
      <path d="M20.5 11.2V12a8.5 8.5 0 1 1-5-7.8" />
      <path d="M9 11.5l3 3 8.5-8.5" />
    </Icono>
  );
}

export function IconoSede(props: Props) {
  return (
    <Icono {...props}>
      <path d="M19.5 10.5c0 5.5-7.5 11-7.5 11s-7.5-5.5-7.5-11a7.5 7.5 0 0 1 15 0Z" />
      <circle cx="12" cy="10.5" r="2.75" />
    </Icono>
  );
}

export function IconoLlave(props: Props) {
  return (
    <Icono {...props}>
      <circle cx="7.5" cy="15.5" r="3.75" />
      <path d="M10.2 12.8 20 3" />
      <path d="M16.5 6.5l2.5 2.5" />
      <path d="M14 9l2 2" />
    </Icono>
  );
}

export function IconoEntrada(props: Props) {
  return (
    <Icono {...props}>
      <path d="M12 3v10" />
      <path d="M8 9.5l4 4 4-4" />
      <path d="M4 16.5v2a2.5 2.5 0 0 0 2.5 2.5h11a2.5 2.5 0 0 0 2.5-2.5v-2" />
    </Icono>
  );
}

export function IconoSalida(props: Props) {
  return (
    <Icono {...props}>
      <path d="M12 14V4" />
      <path d="M8 8l4-4 4 4" />
      <path d="M4 16.5v2a2.5 2.5 0 0 0 2.5 2.5h11a2.5 2.5 0 0 0 2.5-2.5v-2" />
    </Icono>
  );
}

export function IconoHistorial(props: Props) {
  return (
    <Icono {...props}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.4" />
      <path d="M3.5 4v4.5H8" />
      <path d="M12 8v4.3l2.8 1.7" />
    </Icono>
  );
}

/** Quitar de una lista, que no es lo mismo que borrar el registro. */
export function IconoQuitar(props: Props) {
  return (
    <Icono {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12h7" />
    </Icono>
  );
}

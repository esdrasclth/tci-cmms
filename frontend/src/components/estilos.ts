/**
 * Clases compartidas de la interfaz.
 *
 * Viven aparte de `ui.tsx` a proposito: son funciones puras, sin estado ni
 * eventos, y `ui.tsx` lleva `"use client"` por sus componentes. Al estar aqui
 * las puede usar tambien un componente de servidor —la pagina 404, por
 * ejemplo—, que si no tendria que volverse de cliente solo para pintar un
 * boton.
 */

/**
 * Alturas de control. `md` es la de por defecto y la que usan los campos.
 *
 * `xs` es para acciones dentro de filas de tabla, donde el boton no es el
 * protagonista y crecerlo engorda cada fila del listado. Solo aparece en la
 * tabla de escritorio: en movil esas mismas acciones se dibujan como tarjeta y
 * usan `sm`, que si respeta el minimo tactil.
 */
export const ALTURAS = {
  // Cuadrado y sin padding lateral: para botones que solo llevan icono.
  icono: "h-8 w-8 md:h-7 md:w-7",
  xs: "h-8 px-2.5 text-xs md:h-7",
  sm: "h-9 px-3 text-xs md:h-8",
  // `text-base` en movil evita el zoom de iOS al enfocar. Ver `form.tsx`.
  md: "h-11 px-3.5 text-base md:h-9 md:text-sm",
  lg: "h-12 px-4 text-sm",
} as const;

export const VARIANTES = {
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

/**
 * Como `clasesControl` pero sin altura fija: un `<textarea>` la toma de `rows`
 * y fijarsela lo aplastaria a una linea. Mantiene el resto —borde, foco y los
 * 16px en movil que evitan el zoom de iOS— para que no se despegue del resto
 * de campos.
 */
export function clasesArea(className = "") {
  return (
    "w-full rounded-lg border border-tci-borde bg-white px-3.5 py-2.5 " +
    "text-base text-tci-negro placeholder:text-tci-gris/70 transition-colors " +
    "hover:border-tci-gris/60 focus:border-tci-rojo focus:outline-none " +
    "disabled:cursor-not-allowed disabled:bg-tci-humo " +
    `md:text-sm ${className}`
  );
}

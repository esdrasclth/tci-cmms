"use client";

import { useEffect, useId, useRef, useState } from "react";

import { useDebounce } from "@/lib/hooks";
import { clasesControl } from "@/components/ui";

/**
 * Selector con buscador, para catalogos que crecen sin techo.
 *
 * Un `<select>` es perfecto mientras las opciones caben en la cabeza de quien
 * elige: prioridades, roles, estados. Deja de servir cuando la lista es de
 * clientes o equipos, porque el navegador la pinta entera y elegir pasa a ser
 * desplazar hasta encontrar. Con mil clientes, ademas, hay que descargarlos los
 * mil para llenar un desplegable del que se usara uno.
 *
 * Este componente le da la vuelta: **no trae nada hasta que se escribe**, y
 * entonces pide al servidor solo las primeras coincidencias. El coste deja de
 * depender del tamano del catalogo.
 *
 * Accesibilidad: es el patron `combobox` de ARIA. El campo anuncia que controla
 * una lista, la lista anuncia cual es la opcion activa, y todo se maneja con
 * flechas, Enter y Escape sin tocar el raton — que es como lo usa quien lleva
 * la orden en una mano.
 */

/**
 * `datos` deja colgar el registro completo de la opcion. Sin eso, quien elige
 * solo recibe un id y tendria que volver a buscarlo para saber, por ejemplo,
 * cuantas existencias tiene el repuesto que acaba de escoger.
 */
export type Opcion<T = undefined> = {
  valor: string;
  texto: string;
  detalle?: string;
  datos?: T;
};

export function SelectorBuscable<T = undefined>({
  id,
  etiqueta,
  valor,
  textoSeleccionado,
  onCambio,
  buscar,
  placeholder,
  deshabilitado = false,
  ayuda,
  etiquetaOculta = false,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  /** Texto de lo ya elegido. El componente no lo sabe: puede venir de una
   *  orden que se esta editando, sin que se haya buscado nada. */
  textoSeleccionado?: string;
  onCambio: (valor: string, texto: string, datos?: T) => void;
  buscar: (consulta: string) => Promise<Opcion<T>[]>;
  placeholder: string;
  deshabilitado?: boolean;
  ayuda?: string;
  /** En las barras de filtro la etiqueta sobra a la vista, pero no al oido:
   *  se oculta con `sr-only` en vez de quitarla. */
  etiquetaOculta?: boolean;
}) {
  const idLista = useId();
  const contenedor = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [activo, setActivo] = useState(0);
  /**
   * Se guarda con la consulta a la que responde. De ahi sale "cargando" sin
   * necesidad de un estado aparte: si lo guardado no corresponde a lo que se
   * esta buscando ahora, es que aun no ha llegado. Ademas cubre gratis la
   * espera del `debounce`, que un `setCargando` en el efecto se perderia — y
   * ese `setState` sincrono es justo lo que desaconseja React.
   */
  const [resultado, setResultado] = useState<{
    consulta: string;
    opciones: Opcion<T>[];
  } | null>(null);

  const consultaDiferida = useDebounce(consulta);

  useEffect(() => {
    if (!abierto) return;
    let cancelado = false;
    buscar(consultaDiferida)
      .then((r) => {
        if (cancelado) return;
        setResultado({ consulta: consultaDiferida, opciones: r });
        setActivo(0);
      })
      .catch(() => {
        if (cancelado) return;
        setResultado({ consulta: consultaDiferida, opciones: [] });
      });
    return () => {
      cancelado = true;
    };
  }, [abierto, consultaDiferida, buscar]);

  const opciones = resultado?.opciones ?? [];
  const cargando = resultado?.consulta !== consultaDiferida;

  // Cerrar al tocar fuera. `mousedown` y no `click`: si se espera al click, un
  // arrastre que empiece dentro y acabe fuera cierra la lista sin querer.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) cerrar();
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  function cerrar() {
    setAbierto(false);
    setConsulta("");
    // Al reabrir se busca de nuevo: si no, se veria un instante el resultado
    // de la busqueda anterior.
    setResultado(null);
  }

  function elegir(o: Opcion<T>) {
    onCambio(o.valor, o.texto, o.datos);
    cerrar();
    campo.current?.blur();
  }

  function alTeclear(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!abierto) {
        setAbierto(true);
        return;
      }
      const paso = e.key === "ArrowDown" ? 1 : -1;
      setActivo(
        (i) => (i + paso + opciones.length) % Math.max(opciones.length, 1),
      );
    } else if (e.key === "Enter" && abierto) {
      // Solo si hay algo que elegir: si no, el Enter debe llegar al formulario.
      if (opciones[activo]) {
        e.preventDefault();
        elegir(opciones[activo]);
      }
    } else if (e.key === "Escape" && abierto) {
      e.preventDefault();
      cerrar();
    }
  }

  return (
    <div>
      <label
        htmlFor={id}
        className={
          etiquetaOculta
            ? "sr-only"
            : "mb-1.5 block text-sm font-semibold tracking-[-0.01em] text-tci-negro"
        }
      >
        {etiqueta}
      </label>

      {/* El campo visible no lleva `name`: mientras se escribe contiene la
          consulta, no el valor. El que viaja en el formulario es este, que
          siempre tiene el id elegido — asi los formularios que leen con
          `FormData` siguen funcionando sin cambiar nada. */}
      <input type="hidden" name={id} value={valor} />

      <div ref={contenedor} className="relative">
        <input
          ref={campo}
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={abierto}
          aria-controls={idLista}
          aria-autocomplete="list"
          aria-activedescendant={
            abierto && opciones[activo] ? `${idLista}-${activo}` : undefined
          }
          disabled={deshabilitado}
          placeholder={placeholder}
          // Cerrado muestra lo elegido; abierto, lo que se esta escribiendo.
          value={abierto ? consulta : (textoSeleccionado ?? "")}
          onChange={(e) => {
            setConsulta(e.target.value);
            if (!abierto) setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={alTeclear}
          className={clasesControl("w-full pr-9")}
        />

        {valor && !abierto && !deshabilitado && (
          <button
            type="button"
            onClick={() => {
              onCambio("", "");
              campo.current?.focus();
            }}
            aria-label={`Quitar ${etiqueta.toLowerCase()}`}
            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-tci-gris transition-colors hover:text-tci-negro"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}

        {abierto && (
          <ul
            id={idLista}
            role="listbox"
            aria-label={etiqueta}
            className="absolute z-30 mt-1 max-h-64 w-full overscroll-contain overflow-y-auto rounded-lg border border-tci-borde bg-white shadow-lg"
          >
            {cargando && opciones.length === 0 ? (
              <li className="px-3 py-3 text-sm text-tci-gris">Buscando...</li>
            ) : opciones.length === 0 ? (
              <li className="px-3 py-3 text-sm text-tci-gris">
                {consulta ? "Ninguna coincidencia." : "Escriba para buscar."}
              </li>
            ) : (
              opciones.map((o, i) => (
                <li
                  key={o.valor}
                  id={`${idLista}-${i}`}
                  role="option"
                  aria-selected={i === activo}
                >
                  <button
                    type="button"
                    // `onMouseDown` y no `onClick`: el click llega despues del
                    // blur del campo, que ya habria cerrado la lista.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      elegir(o);
                    }}
                    onMouseEnter={() => setActivo(i)}
                    className={`flex w-full flex-col items-start px-3 py-2.5 text-left text-sm transition-colors ${
                      i === activo ? "bg-tci-humo" : ""
                    }`}
                  >
                    <span className="text-tci-negro">{o.texto}</span>
                    {o.detalle && (
                      <span className="text-xs text-tci-gris">{o.detalle}</span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {ayuda && <p className="mt-1.5 text-xs text-tci-gris">{ayuda}</p>}
    </div>
  );
}

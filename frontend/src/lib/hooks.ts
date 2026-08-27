"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Difiere un valor hasta que deja de cambiar durante `ms`.
 *
 * Se usa en los cuadros de busqueda (TCI-39): sin esto, cada tecla dispara una
 * peticion. El setState vive dentro del temporizador, no en el cuerpo del
 * efecto, que es lo que React desaconseja.
 */
export function useDebounce<T>(valor: T, ms = 300): T {
  const [diferido, setDiferido] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => setDiferido(valor), ms);
    return () => clearTimeout(temporizador);
  }, [valor, ms]);

  return diferido;
}

/**
 * Congela el desplazamiento de la pagina mientras hay una capa encima.
 *
 * No basta con `overflow: hidden` en el `body`: **Safari de iOS lo ignora** y
 * la pagina de detras se sigue moviendo bajo el dialogo. Lo que si respeta es
 * sacar el `body` del flujo con `position: fixed`, y eso obliga a guardar la
 * posicion y devolverla al cerrar, porque fijar el body la pierde —el salto al
 * cerrar un dialogo viene justo de no hacerlo—.
 *
 * `scrollRestoration` se desactiva un instante para que el navegador no intente
 * ademas restaurar la suya y peleen las dos.
 */
export function useBloqueoScroll(activo: boolean) {
  useEffect(() => {
    if (!activo) return;

    const y = window.scrollY;
    const { body } = document;
    const previo = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = previo.position;
      body.style.top = previo.top;
      body.style.width = previo.width;
      body.style.overflow = previo.overflow;
      // `instant`: con desplazamiento suave se ve volar la pagina al cerrar.
      window.scrollTo({ top: y, behavior: "instant" });
    };
  }, [activo]);
}

/**
 * Trae un cliente por id, con sus sedes.
 *
 * Lo usan las pantallas que dejaron de descargar el catalogo entero: al elegir
 * cliente en un selector con buscador solo se conoce su id, y las sedes cuelgan
 * de el. Devuelve `null` mientras no haya id o mientras viaja la peticion.
 *
 * Se compara el id guardado con el pedido en vez de limpiar el estado al
 * cambiar: asi no hay un `setState` sincrono en el efecto —lo que desaconseja
 * `react-hooks/set-state-in-effect`— y de paso nunca se ven un instante las
 * sedes del cliente anterior.
 */
export function useClienteConSedes<T extends { id: string }>(
  clienteId: string,
  obtener: (id: string) => Promise<T>,
): T | null {
  const [cargado, setCargado] = useState<T | null>(null);

  useEffect(() => {
    if (!clienteId) return;
    let cancelado = false;
    obtener(clienteId)
      .then((c) => {
        if (!cancelado) setCargado(c);
      })
      .catch(() => {
        if (!cancelado) setCargado(null);
      });
    return () => {
      cancelado = true;
    };
  }, [clienteId, obtener]);

  return cargado?.id === clienteId ? cargado : null;
}

/** Lo que el navegador considera alcanzable con el tabulador. */
const ENFOCABLES = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Encierra el tabulador dentro de una capa y devuelve el foco al salir.
 *
 * `aria-modal="true"` le dice al lector de pantalla que lo de detras no
 * existe, pero **no impide tabular hasta ahi**: sin esto, tres pulsaciones de
 * Tab sacaban el foco del dialogo y lo dejaban recorriendo una pagina que
 * sigue viva debajo del velo. Quien navega con teclado acaba escribiendo en un
 * formulario que no ve.
 *
 * Al cerrar devuelve el foco a lo que abrio la capa. Sin eso el foco vuelve al
 * principio del documento y hay que recorrer el menu entero para retomar donde
 * se estaba.
 *
 * @param activo  Si la capa esta abierta.
 * @param inicial Que enfocar al abrir. Por defecto, lo primero enfocable; se
 *                pasa cuando el primer control no es donde se quiere empezar
 *                —un boton de cerrar antes del campo, por ejemplo—.
 */
export function useTrampaFoco<T extends HTMLElement>(
  activo: boolean,
  inicial?: RefObject<HTMLElement | null>,
) {
  const contenedor = useRef<T>(null);

  useEffect(() => {
    if (!activo) return;
    const nodo = contenedor.current;
    if (!nodo) return;

    const previo = document.activeElement as HTMLElement | null;

    // Se recalcula en cada Tab y no una sola vez: dentro de un dialogo
    // aparecen y desaparecen controles —el boton de guardar se deshabilita
    // mientras guarda, la lista del buscador se abre— y una lista congelada
    // mandaria el foco a un elemento que ya no acepta.
    const enfocables = () =>
      Array.from(nodo.querySelectorAll<HTMLElement>(ENFOCABLES)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    const alAbrir = requestAnimationFrame(() => {
      (inicial?.current ?? enfocables()[0] ?? nodo).focus();
    });

    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key !== "Tab") return;
      const lista = enfocables();
      if (lista.length === 0) {
        evento.preventDefault();
        return;
      }
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      const foco = document.activeElement;
      const fuera = !nodo.contains(foco);

      if (evento.shiftKey && (foco === primero || fuera)) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && (foco === ultimo || fuera)) {
        evento.preventDefault();
        primero.focus();
      }
    };

    // En captura: si un control de dentro para la propagacion del keydown, el
    // ciclo se romperia en fase de burbuja.
    document.addEventListener("keydown", alTeclear, true);
    return () => {
      cancelAnimationFrame(alAbrir);
      document.removeEventListener("keydown", alTeclear, true);
      previo?.focus?.();
    };
  }, [activo, inicial]);

  return contenedor;
}

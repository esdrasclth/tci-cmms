"use client";

import { useEffect, useState } from "react";

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

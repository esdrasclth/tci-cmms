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

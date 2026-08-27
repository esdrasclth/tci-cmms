"use client";

import { useEffect, type ReactNode } from "react";
import { Boton } from "@/components/ui";

/**
 * Marco de dialogo compartido por las pantallas de gestion.
 *
 * Se usa un overlay propio y no `<dialog>` ni `window.confirm`: los dialogos
 * nativos del navegador bloquean el hilo y no se pueden estilar con la marca.
 */
export function Modal({
  titulo,
  onCerrar,
  children,
  bloqueado = false,
}: {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  /** Mientras se guarda, no se deja cerrar por Escape ni por el fondo. */
  bloqueado?: boolean;
}) {
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !bloqueado) onCerrar();
    };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [onCerrar, bloqueado]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !bloqueado) onCerrar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="max-h-full w-full overflow-y-auto rounded-t-2xl bg-white p-6 sm:max-w-lg sm:rounded-2xl"
      >
        <h2 className="tci-display text-xl font-semibold text-tci-negro">
          {titulo}
        </h2>
        {children}
      </div>
    </div>
  );
}

/**
 * Cancelar / Guardar al pie de un dialogo.
 *
 * Los dos botones van al 50% y no dimensionados por su texto: en un dialogo el
 * par de acciones es una unidad, y con anchos distintos el pie se ve torcido.
 */
export function BotonesDialogo({
  onCerrar,
  guardando,
  texto,
}: {
  onCerrar: () => void;
  guardando: boolean;
  texto: string;
}) {
  return (
    <div className="flex gap-3 pt-2">
      <Boton
        type="button"
        variante="secundario"
        onClick={onCerrar}
        disabled={guardando}
        className="flex-1"
      >
        Cancelar
      </Boton>
      <Boton type="submit" cargando={guardando} className="flex-1">
        {guardando ? "Guardando..." : texto}
      </Boton>
    </div>
  );
}

/** Boton pequeno de las columnas de acciones. */
export function BotonFila({
  children,
  onClick,
  disabled,
  titulo,
  peligro = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  titulo?: string;
  peligro?: boolean;
}) {
  return (
    <Boton
      tamano="xs"
      variante={peligro ? "peligro" : "secundario"}
      onClick={onClick}
      disabled={disabled}
      title={titulo}
    >
      {children}
    </Boton>
  );
}

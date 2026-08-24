"use client";

import { useEffect, type ReactNode } from "react";

import { BotonPrimario } from "@/components/form";

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
        <h2 className="text-xl font-bold text-tci-negro">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

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
      <button
        type="button"
        onClick={onCerrar}
        disabled={guardando}
        className="flex-1 rounded-lg border border-tci-borde px-4 py-3 text-sm font-bold text-tci-negro hover:bg-tci-humo disabled:opacity-50"
      >
        Cancelar
      </button>
      <div className="flex-1">
        <BotonPrimario type="submit" cargando={guardando}>
          {guardando ? "Guardando..." : texto}
        </BotonPrimario>
      </div>
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
    <button
      onClick={onClick}
      disabled={disabled}
      title={titulo}
      className={`rounded-lg border px-3 py-1.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 ${
        peligro
          ? "border-tci-rojo/40 text-tci-rojo hover:bg-tci-rojo/5"
          : "border-tci-borde text-tci-negro hover:bg-tci-humo"
      }`}
    >
      {children}
    </button>
  );
}

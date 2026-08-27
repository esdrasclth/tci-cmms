"use client";

import { useEffect, type ReactNode } from "react";
import { useBloqueoScroll } from "@/lib/hooks";
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
  // Sin esto la pagina de detras se desplaza bajo el dialogo, y al cerrarlo
  // aparece en otro sitio del que estaba.
  useBloqueoScroll(true);

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
        className="max-h-full w-full overscroll-contain overflow-y-auto rounded-t-2xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:rounded-2xl sm:pb-6"
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

/**
 * Accion de una fila de tabla.
 *
 * Va en icono solo cuando el simbolo se reconoce sin haberlo aprendido: el
 * lapiz y la papelera. Son 15 de los 27 botones, o sea casi toda la ganancia
 * de espacio, y nadie tiene que adivinar que hacen.
 *
 * El resto conservan su nombre escrito. Un circulo tachado no dice si activa o
 * desactiva, y una flecha no distingue "entrada de almacen" de "salida": ahi el
 * icono ahorra ancho a cambio de una duda, y esto lo usa gente que entra a la
 * aplicacion de vez en cuando, no a diario. El tooltip tampoco rescata el caso,
 * porque en una tablet no hay donde posar el cursor.
 *
 * `etiqueta` es obligatoria en los dos modos: con icono es el nombre accesible
 * —el icono va `aria-hidden`— y sin el es el texto visible.
 */
export function BotonFila({
  icono: Icono,
  etiqueta,
  onClick,
  disabled,
  titulo,
  peligro = false,
}: {
  icono?: (props: { className?: string }) => ReactNode;
  etiqueta: string;
  onClick: () => void;
  disabled?: boolean;
  /** Motivo cuando esta deshabilitado. */
  titulo?: string;
  peligro?: boolean;
}) {
  const variante = peligro ? "peligro" : "secundario";

  if (!Icono) {
    return (
      <Boton
        tamano="xs"
        variante={variante}
        onClick={onClick}
        disabled={disabled}
        title={titulo}
      >
        {etiqueta}
      </Boton>
    );
  }

  return (
    <Boton
      tamano="icono"
      variante={variante}
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      title={titulo ?? etiqueta}
    >
      <Icono className="h-4 w-4" />
    </Boton>
  );
}

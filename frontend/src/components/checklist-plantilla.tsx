"use client";

import { useEffect, useState } from "react";

import { Alerta } from "@/components/form";
import { BotonesDialogo, Modal } from "@/components/modal";
import { Boton, clasesControl } from "@/components/ui";
import { ApiError } from "@/lib/api";
import {
  guardarChecklistTipo,
  listarChecklistTipo,
  type TipoMantenimiento,
} from "@/lib/tipos-mantenimiento";

/**
 * Plantilla de verificacion de un tipo de mantenimiento.
 *
 * Lo que se edita aqui es la plantilla, no lo marcado: cada orden se lleva su
 * copia al crearse. Por eso **cambiar esta lista no altera ninguna orden ya
 * levantada**, y conviene que se lea en la propia pantalla — es la clase de
 * regla que, si no se dice, se descubre borrando algo.
 *
 * La lista se guarda entera de una vez. Es lo que permite reordenar y editar
 * sin pensar en identificadores: la posicion en pantalla es la posicion, y
 * punto.
 */
export function DialogoChecklist({
  tipo,
  onCerrar,
}: {
  tipo: TipoMantenimiento;
  onCerrar: () => void;
}) {
  const [items, setItems] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    listarChecklistTipo(tipo.id)
      .then((lista) => {
        if (!cancelado) setItems(lista.map((i) => i.texto));
      })
      .catch(() => {
        if (!cancelado) setError("No se pudo cargar la lista.");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [tipo.id]);

  function cambiar(indice: number, texto: string) {
    setItems((lista) => lista.map((v, i) => (i === indice ? texto : v)));
  }

  function quitar(indice: number) {
    setItems((lista) => lista.filter((_, i) => i !== indice));
  }

  function mover(indice: number, salto: -1 | 1) {
    setItems((lista) => {
      const destino = indice + salto;
      if (destino < 0 || destino >= lista.length) return lista;
      const copia = [...lista];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
  }

  async function guardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await guardarChecklistTipo(
        tipo.id,
        items.map((t) => t.trim()).filter(Boolean),
      );
      onCerrar();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "No se pudo guardar la lista.",
      );
      setGuardando(false);
    }
  }

  return (
    <Modal
      titulo={`Lista de verificacion — ${tipo.nombre}`}
      onCerrar={onCerrar}
      bloqueado={guardando}
    >
      <form onSubmit={guardar} className="mt-4 space-y-4">
        {error && <Alerta>{error}</Alerta>}

        <p className="text-sm text-tci-grafito">
          Estas comprobaciones se copian a cada orden nueva de este tipo.
          Cambiarlas <strong>no altera las ordenes ya levantadas</strong>.
        </p>

        {cargando ? (
          <p className="text-sm text-tci-gris">Cargando...</p>
        ) : (
          <>
            <ul className="space-y-2">
              {items.map((texto, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-right font-mono text-xs text-tci-gris tabular-nums">
                    {i + 1}
                  </span>
                  <input
                    value={texto}
                    onChange={(e) => cambiar(i, e.target.value)}
                    maxLength={200}
                    placeholder="Revisar apriete de bornes"
                    disabled={guardando}
                    className={clasesControl("min-w-0 flex-1")}
                  />
                  <div className="flex shrink-0">
                    <BotonOrden
                      etiqueta={`Subir "${texto || "sin texto"}"`}
                      onClick={() => mover(i, -1)}
                      disabled={guardando || i === 0}
                    >
                      &uarr;
                    </BotonOrden>
                    <BotonOrden
                      etiqueta={`Bajar "${texto || "sin texto"}"`}
                      onClick={() => mover(i, 1)}
                      disabled={guardando || i === items.length - 1}
                    >
                      &darr;
                    </BotonOrden>
                    <BotonOrden
                      etiqueta={`Quitar "${texto || "sin texto"}"`}
                      onClick={() => quitar(i)}
                      disabled={guardando}
                      peligro
                    >
                      &times;
                    </BotonOrden>
                  </div>
                </li>
              ))}
            </ul>

            {items.length === 0 && (
              <p className="rounded-lg bg-tci-humo px-4 py-3 text-sm text-tci-gris">
                Sin comprobaciones. Las ordenes de este tipo saldran sin lista.
              </p>
            )}

            <Boton
              type="button"
              variante="secundario"
              onClick={() => setItems((l) => [...l, ""])}
              disabled={guardando || items.length >= 60}
            >
              Anadir comprobacion
            </Boton>
          </>
        )}

        <BotonesDialogo
          onCerrar={onCerrar}
          guardando={guardando}
          texto="Guardar lista"
        />
      </form>
    </Modal>
  );
}

/** Los tres controles de fila: subir, bajar y quitar. */
function BotonOrden({
  children,
  etiqueta,
  onClick,
  disabled,
  peligro = false,
}: {
  children: React.ReactNode;
  etiqueta: string;
  onClick: () => void;
  disabled?: boolean;
  peligro?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      title={etiqueta}
      className={`flex h-9 w-8 items-center justify-center text-sm transition-colors disabled:opacity-30 md:h-8 ${
        peligro
          ? "text-tci-gris hover:text-tci-rojo"
          : "text-tci-gris hover:text-tci-negro"
      }`}
    >
      {children}
    </button>
  );
}

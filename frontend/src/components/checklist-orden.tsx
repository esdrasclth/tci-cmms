"use client";

import { useState } from "react";

import { Alerta } from "@/components/form";
import { ApiError } from "@/lib/api";
import { marcarChecklist, type ItemChecklist } from "@/lib/ordenes";

/**
 * Lista de verificacion de una orden.
 *
 * Las comprobaciones se copian de la plantilla del tipo de mantenimiento al
 * crear la orden. Un preventivo de tablero electrico son siempre las mismas
 * doce revisiones, y hasta ahora cabian en el campo de texto libre del trabajo
 * realizado, que es donde se pierden.
 *
 * El estado no se guarda aqui: cada marca va al servidor y la orden se relee
 * entera. Es una peticion por marca, y a cambio dos personas mirando la misma
 * orden ven lo mismo — que en una orden que se trabaja entre varios importa
 * mas que ahorrarse el viaje.
 */
export function ChecklistOrden({
  ordenId,
  items,
  puedeEditar,
  onCambio,
}: {
  ordenId: string;
  items: ItemChecklist[];
  /** Una orden cerrada no admite cambios: el backend responde 422. */
  puedeEditar: boolean;
  onCambio: () => Promise<void>;
}) {
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p className="text-sm text-tci-gris">
        Este tipo de mantenimiento no tiene lista de verificacion.
      </p>
    );
  }

  const hechos = items.filter((i) => i.hecho).length;
  const completa = hechos === items.length;

  async function alternar(item: ItemChecklist) {
    setGuardando(item.id);
    setError(null);
    try {
      await marcarChecklist(ordenId, item.id, { hecho: !item.hecho });
      await onCambio();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No se pudo marcar la comprobacion.",
      );
    } finally {
      setGuardando(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && <Alerta>{error}</Alerta>}

      <div className="flex items-center gap-3">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-tci-borde"
          role="progressbar"
          aria-valuenow={hechos}
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-label="Comprobaciones hechas"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${
              completa ? "bg-emerald-600" : "bg-tci-rojo"
            }`}
            style={{ width: `${(hechos / items.length) * 100}%` }}
          />
        </div>
        <span className="font-mono text-xs whitespace-nowrap text-tci-gris tabular-nums">
          {hechos} / {items.length}
        </span>
      </div>

      <ul className="divide-y divide-tci-borde">
        {items.map((item) => (
          <li key={item.id}>
            <label
              className={`flex min-h-11 items-start gap-3 py-2.5 ${
                puedeEditar ? "cursor-pointer" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={item.hecho}
                disabled={!puedeEditar || guardando === item.id}
                onChange={() => void alternar(item)}
                // `mt-0.5` alinea la casilla con la primera linea del texto
                // cuando la comprobacion ocupa dos.
                className="mt-0.5 h-5 w-5 shrink-0 accent-tci-rojo"
              />
              <span className="min-w-0">
                <span
                  className={`block text-sm ${
                    item.hecho
                      ? "text-tci-gris line-through"
                      : "text-tci-grafito"
                  }`}
                >
                  {item.texto}
                </span>
                {item.hecho && item.marcadoPor && (
                  <span className="block text-xs text-tci-gris">
                    {item.marcadoPor.name}
                  </span>
                )}
                {item.nota && (
                  <span className="mt-0.5 block text-xs text-tci-grafito italic">
                    {item.nota}
                  </span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>

      {!puedeEditar && (
        <p className="text-xs text-tci-gris">
          La orden esta cerrada: su lista queda como quedo.
        </p>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Alerta } from "@/components/form";
import { BotonFila } from "@/components/modal";
import { ApiError } from "@/lib/api";
import {
  corregirConsumo,
  formatearCantidad,
  formatearMoneda,
  imputarRepuesto,
  listarConsumo,
  listarDisponibles,
  retirarConsumo,
  type LineaConsumo,
  type RepuestoDisponible,
} from "@/lib/repuestos";

/**
 * TCI-46 — repuestos consumidos en una orden.
 *
 * Lo usa sobre todo el tecnico en campo, asi que el alta es lo primero y ocupa
 * una sola fila: elegir repuesto, cantidad, listo. La lista de opciones ya viene
 * filtrada por el backend (solo activos y con existencia), de modo que aqui no
 * se ofrece nada que vaya a devolver un 422.
 *
 * Cada cambio avisa al padre con `onCambio` porque imputar mueve el costo de la
 * orden, que se muestra en otra tarjeta: sin eso, el total quedaria desfasado
 * hasta recargar.
 */
export function RepuestosOrden({
  ordenId,
  puedeEditar,
  moneda,
  onCambio,
}: {
  ordenId: string;
  /** Una orden cerrada no admite cambios en su consumo: el backend da 422. */
  puedeEditar: boolean;
  moneda: string;
  onCambio: () => void | Promise<void>;
}) {
  const [lineas, setLineas] = useState<LineaConsumo[]>([]);
  const [disponibles, setDisponibles] = useState<RepuestoDisponible[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const releer = useCallback(async () => {
    const lista = await listarConsumo(ordenId);
    setLineas(lista);
  }, [ordenId]);

  useEffect(() => {
    let cancelado = false;
    Promise.all([listarConsumo(ordenId), listarDisponibles()])
      .then(([consumo, catalogo]) => {
        if (cancelado) return;
        setLineas(consumo);
        setDisponibles(catalogo);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setError(
            e instanceof ApiError
              ? e.message
              : "No se pudieron cargar los repuestos.",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [ordenId]);

  /** Envuelve una operacion: bloquea, relee y avisa al detalle de la orden. */
  async function operar(accion: () => Promise<unknown>, fallo: string) {
    setOcupado(true);
    setError(null);
    try {
      await accion();
      await releer();
      // El catalogo tambien cambia: lo que se acaba de gastar baja de saldo y
      // puede desaparecer de las opciones si llego a cero.
      setDisponibles(await listarDisponibles());
      await onCambio();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : fallo);
    } finally {
      setOcupado(false);
    }
  }

  const total = lineas.reduce(
    (suma, linea) => suma + Number(linea.cantidad) * Number(linea.costoUnitario),
    0,
  );

  if (cargando) {
    return <p className="text-sm text-tci-gris">Cargando repuestos...</p>;
  }

  return (
    <div>
      {error && (
        <div className="mb-4">
          <Alerta>{error}</Alerta>
        </div>
      )}

      {lineas.length === 0 ? (
        <p className="text-sm text-tci-gris">
          Sin repuestos imputados todavía.
        </p>
      ) : (
        <ul className="space-y-3">
          {lineas.map((linea) => (
            <Linea
              key={linea.id}
              linea={linea}
              puedeEditar={puedeEditar && !ocupado}
              moneda={moneda}
              onCorregir={(cantidad) =>
                operar(
                  () => corregirConsumo(ordenId, linea.id, cantidad),
                  "No se pudo corregir la cantidad.",
                )
              }
              onRetirar={() =>
                operar(
                  () => retirarConsumo(ordenId, linea.id),
                  "No se pudo retirar el repuesto.",
                )
              }
            />
          ))}
        </ul>
      )}

      {lineas.length > 0 && (
        <p className="mt-3 border-t border-tci-borde pt-3 text-sm text-tci-grafito">
          Total en repuestos:{" "}
          <strong className="text-tci-negro">
            {formatearMoneda(total, moneda)}
          </strong>
        </p>
      )}

      {puedeEditar && (
        <FormularioImputar
          disponibles={disponibles}
          ocupado={ocupado}
          onImputar={(repuestoId, cantidad) =>
            operar(
              () => imputarRepuesto(ordenId, { repuestoId, cantidad }),
              "No se pudo imputar el repuesto.",
            )
          }
        />
      )}
    </div>
  );
}

function Linea({
  linea,
  puedeEditar,
  moneda,
  onCorregir,
  onRetirar,
}: {
  linea: LineaConsumo;
  puedeEditar: boolean;
  moneda: string;
  onCorregir: (cantidad: number) => Promise<void>;
  onRetirar: () => Promise<void>;
}) {
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [cantidad, setCantidad] = useState(String(Number(linea.cantidad)));

  const importe = Number(linea.cantidad) * Number(linea.costoUnitario);
  const bajoMinimo =
    Number(linea.repuesto.stockMinimo) > 0 &&
    Number(linea.repuesto.stockActual) <= Number(linea.repuesto.stockMinimo);

  return (
    <li className="border-b border-tci-borde pb-3 last:border-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="font-bold text-tci-negro">{linea.repuesto.nombre}</p>
          <p className="text-xs text-tci-gris">
            {linea.repuesto.codigo} ·{" "}
            {formatearMoneda(linea.costoUnitario, moneda)} por{" "}
            {linea.repuesto.unidadMedida}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-tci-negro">
            {formatearCantidad(linea.cantidad)} {linea.repuesto.unidadMedida}
          </p>
          <p className="text-xs text-tci-gris">
            {formatearMoneda(importe, moneda)}
          </p>
        </div>
      </div>

      {/* TCI-47: el aviso aparece donde se acaba de gastar, no solo en la
          pantalla de almacen, que el tecnico no ve. */}
      {bajoMinimo && (
        <p className="mt-1 text-xs font-semibold text-amber-700">
          Quedan {formatearCantidad(linea.repuesto.stockActual)}{" "}
          {linea.repuesto.unidadMedida} en almacén: está en el mínimo.
        </p>
      )}

      {puedeEditar && !corrigiendo && (
        <div className="mt-2 flex flex-wrap gap-2">
          <BotonFila onClick={() => setCorrigiendo(true)}>
            Corregir cantidad
          </BotonFila>
          <BotonFila peligro onClick={() => void onRetirar()}>
            Retirar
          </BotonFila>
        </div>
      )}

      {puedeEditar && corrigiendo && (
        <form
          className="mt-2 flex flex-wrap items-end gap-2"
          onSubmit={(evento) => {
            evento.preventDefault();
            void onCorregir(Number(cantidad)).then(() => setCorrigiendo(false));
          }}
        >
          <div>
            <label
              htmlFor={`cantidad-${linea.id}`}
              className="mb-1 block text-xs text-tci-gris"
            >
              Cantidad real usada
            </label>
            <input
              id={`cantidad-${linea.id}`}
              type="number"
              step="0.001"
              min="0.001"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="w-32 rounded-lg border border-tci-borde px-3 py-2 text-sm text-tci-negro focus:border-tci-rojo focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-tci-rojo px-4 py-2 text-sm font-semibold text-white hover:bg-tci-rojo-hover"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => {
              setCantidad(String(Number(linea.cantidad)));
              setCorrigiendo(false);
            }}
            className="rounded-lg border border-tci-borde px-4 py-2 text-sm font-semibold text-tci-negro hover:bg-tci-humo"
          >
            Cancelar
          </button>
        </form>
      )}
    </li>
  );
}

function FormularioImputar({
  disponibles,
  ocupado,
  onImputar,
}: {
  disponibles: RepuestoDisponible[];
  ocupado: boolean;
  onImputar: (repuestoId: string, cantidad: number) => Promise<void>;
}) {
  const [repuestoId, setRepuestoId] = useState("");
  const [cantidad, setCantidad] = useState("1");

  const elegido = disponibles.find((r) => r.id === repuestoId);

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!repuestoId) return;
    void onImputar(repuestoId, Number(cantidad)).then(() => {
      setRepuestoId("");
      setCantidad("1");
    });
  }

  if (disponibles.length === 0) {
    return (
      <p className="mt-4 rounded-lg bg-tci-humo px-4 py-3 text-sm text-tci-gris">
        No hay repuestos con existencia en almacén.
      </p>
    );
  }

  return (
    <form
      onSubmit={alEnviar}
      className="mt-4 flex flex-wrap items-end gap-2 border-t border-tci-borde pt-4"
    >
      <div className="min-w-0 flex-1">
        <label
          htmlFor="repuesto-a-imputar"
          className="mb-1 block text-xs text-tci-gris"
        >
          Repuesto usado
        </label>
        <select
          id="repuesto-a-imputar"
          value={repuestoId}
          onChange={(e) => setRepuestoId(e.target.value)}
          className="w-full rounded-lg border border-tci-borde bg-white px-3 py-2 text-sm text-tci-negro"
        >
          <option value="">Elija un repuesto...</option>
          {disponibles.map((repuesto) => (
            <option key={repuesto.id} value={repuesto.id}>
              {repuesto.nombre} ({formatearCantidad(repuesto.stockActual)}{" "}
              {repuesto.unidadMedida} disponibles)
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="cantidad-a-imputar"
          className="mb-1 block text-xs text-tci-gris"
        >
          Cantidad
        </label>
        <input
          id="cantidad-a-imputar"
          type="number"
          step="0.001"
          min="0.001"
          max={elegido ? Number(elegido.stockActual) : undefined}
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          className="w-28 rounded-lg border border-tci-borde px-3 py-2 text-sm text-tci-negro focus:border-tci-rojo focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={!repuestoId || ocupado}
        className="rounded-lg bg-tci-rojo px-4 py-2 text-sm font-semibold text-white hover:bg-tci-rojo-hover disabled:opacity-50"
      >
        {ocupado ? "Guardando..." : "Imputar"}
      </button>
    </form>
  );
}

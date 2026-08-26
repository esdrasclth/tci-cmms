"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Alerta } from "@/components/form";
import { ApiError } from "@/lib/api";
import {
  formatearCantidad,
  listarLibro,
  listarRepuestosAdmin,
  type FiltrosLibro,
  type MovimientoInventario,
  type Repuesto,
} from "@/lib/repuestos";

const POR_PAGINA = 50;

/**
 * TCI-48 — historial de movimientos de todo el almacen.
 *
 * El libro de cada repuesto ya existia desde TCI-45, pero contestaba otra
 * pregunta. La que se hace de verdad es "que se movio esta semana", y eso no se
 * responde abriendo repuesto por repuesto.
 *
 * Los asientos no se editan ni se borran: la tabla es solo-append. Por eso esta
 * pantalla no tiene acciones, solo filtros — y por eso el saldo resultante de
 * cada linea sirve para auditar, porque explica como se llego al de hoy.
 */
export function LibroInventario() {
  const [filtros, setFiltros] = useState<FiltrosLibro>({ perPage: POR_PAGINA });
  const [pagina, setPagina] = useState<{
    data: MovimientoInventario[];
    meta: { total: number; page: number; totalPages: number };
  } | null>(null);
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarRepuestosAdmin()
      .then(setRepuestos)
      .catch(() => setRepuestos([]));
  }, []);

  useEffect(() => {
    let cancelado = false;
    listarLibro(filtros)
      .then((datos) => {
        if (cancelado) return;
        setPagina(datos);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setError(
            e instanceof ApiError ? e.message : "No se pudo cargar el libro.",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [filtros]);

  /** Cualquier cambio de filtro vuelve a la primera pagina. */
  function cambiar(parcial: Partial<FiltrosLibro>) {
    setCargando(true);
    setFiltros((actuales) => ({ ...actuales, ...parcial, page: 1 }));
  }

  function irAPagina(page: number) {
    setCargando(true);
    setFiltros((actuales) => ({ ...actuales, page }));
  }

  const movimientos = pagina?.data ?? [];

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="tci-display text-2xl font-semibold text-tci-negro">
            Movimientos de almacén
          </h1>
          <p className="mt-1 text-sm text-tci-gris">
            Todas las entradas y salidas, con quién las hizo y por qué.
          </p>
        </div>
        <Link
          href="/panel/repuestos"
          className="rounded-lg border border-tci-borde bg-white px-4 py-2.5 text-sm font-semibold text-tci-negro hover:bg-tci-humo"
        >
          Ver catálogo
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-tci-borde bg-white p-4">
        <div>
          <label htmlFor="desde" className="mb-1 block text-xs text-tci-gris">
            Desde
          </label>
          <input
            id="desde"
            type="date"
            value={filtros.desde ?? ""}
            onChange={(e) => cambiar({ desde: e.target.value || undefined })}
            className="rounded-lg border border-tci-borde px-3 py-2 text-sm text-tci-negro focus:border-tci-rojo focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="hasta" className="mb-1 block text-xs text-tci-gris">
            Hasta
          </label>
          <input
            id="hasta"
            type="date"
            value={filtros.hasta ?? ""}
            onChange={(e) => cambiar({ hasta: e.target.value || undefined })}
            className="rounded-lg border border-tci-borde px-3 py-2 text-sm text-tci-negro focus:border-tci-rojo focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="tipo" className="mb-1 block text-xs text-tci-gris">
            Movimiento
          </label>
          <select
            id="tipo"
            value={filtros.tipo ?? ""}
            onChange={(e) =>
              cambiar({
                tipo: (e.target.value || undefined) as FiltrosLibro["tipo"],
              })
            }
            className="rounded-lg border border-tci-borde bg-white px-3 py-2 text-sm text-tci-negro"
          >
            <option value="">Entradas y salidas</option>
            <option value="ENTRADA">Solo entradas</option>
            <option value="SALIDA">Solo salidas</option>
          </select>
        </div>
        <div className="min-w-52">
          <label htmlFor="repuesto" className="mb-1 block text-xs text-tci-gris">
            Repuesto
          </label>
          <select
            id="repuesto"
            value={filtros.repuestoId ?? ""}
            onChange={(e) => cambiar({ repuestoId: e.target.value || undefined })}
            className="w-full rounded-lg border border-tci-borde bg-white px-3 py-2 text-sm text-tci-negro"
          >
            <option value="">Todos</option>
            {repuestos.map((repuesto) => (
              <option key={repuesto.id} value={repuesto.id}>
                {repuesto.codigo} — {repuesto.nombre}
              </option>
            ))}
          </select>
        </div>
        <label className="flex cursor-pointer items-center gap-2 py-2 text-sm text-tci-grafito">
          <input
            type="checkbox"
            checked={filtros.soloDeOrdenes ?? false}
            onChange={(e) => cambiar({ soloDeOrdenes: e.target.checked })}
            className="h-4 w-4 cursor-pointer rounded border-tci-borde accent-tci-rojo"
          />
          Solo consumo de órdenes
        </label>
      </div>

      {error && (
        <div className="mt-4">
          <Alerta>{error}</Alerta>
        </div>
      )}

      {pagina && !cargando && (
        <p className="mt-4 text-sm text-tci-gris">
          {pagina.meta.total}{" "}
          {pagina.meta.total === 1 ? "movimiento" : "movimientos"}
        </p>
      )}

      <div className={`mt-3 ${cargando ? "opacity-50" : ""}`}>
        {cargando && !pagina ? (
          <Esqueleto />
        ) : movimientos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-tci-borde bg-white p-8 text-center text-sm text-tci-grafito">
            No hay movimientos que coincidan con el filtro.
          </p>
        ) : (
          <>
            {/* Tabla en escritorio, tarjetas en movil (TCI-44). */}
            <div className="hidden overflow-x-auto rounded-xl border border-tci-borde bg-white md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-tci-borde bg-tci-humo text-xs text-tci-gris uppercase">
                  <tr>
                    <th className="px-4 py-3 font-bold">Fecha</th>
                    <th className="px-4 py-3 font-bold">Repuesto</th>
                    <th className="px-4 py-3 font-bold">Movimiento</th>
                    <th className="px-4 py-3 font-bold">Saldo</th>
                    <th className="px-4 py-3 font-bold">Motivo</th>
                    <th className="px-4 py-3 font-bold">Quién</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((movimiento) => (
                    <tr
                      key={movimiento.id}
                      className="border-b border-tci-borde last:border-0"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-tci-gris">
                        {formatearFechaHora(movimiento.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-tci-negro">
                          {movimiento.repuesto?.nombre ?? "—"}
                        </p>
                        <p className="font-mono text-xs text-tci-gris">
                          {movimiento.repuesto?.codigo}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Cantidad movimiento={movimiento} />
                      </td>
                      <td className="px-4 py-3 text-tci-grafito">
                        {formatearCantidad(movimiento.stockResultante)}
                      </td>
                      <td className="px-4 py-3 text-tci-grafito">
                        {movimiento.motivo ?? "—"}
                        {movimiento.orden && (
                          <Link
                            href={`/panel/ordenes/${movimiento.orden.id}`}
                            className="ml-2 font-mono text-xs font-bold text-tci-negro underline-offset-2 hover:text-tci-rojo hover:underline"
                          >
                            {movimiento.orden.numero}
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-3 text-tci-grafito">
                        {movimiento.usuario.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-3 md:hidden">
              {movimientos.map((movimiento) => (
                <li
                  key={movimiento.id}
                  className="rounded-xl border border-tci-borde bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-tci-negro">
                        {movimiento.repuesto?.nombre ?? "—"}
                      </p>
                      <p className="font-mono text-xs text-tci-gris">
                        {movimiento.repuesto?.codigo}
                      </p>
                    </div>
                    <Cantidad movimiento={movimiento} />
                  </div>
                  <p className="mt-2 text-sm text-tci-grafito">
                    {movimiento.motivo ?? "—"}
                  </p>
                  <p className="mt-1 text-xs text-tci-gris">
                    {formatearFechaHora(movimiento.createdAt)} ·{" "}
                    {movimiento.usuario.name} · quedan{" "}
                    {formatearCantidad(movimiento.stockResultante)}
                  </p>
                  {movimiento.orden && (
                    <Link
                      href={`/panel/ordenes/${movimiento.orden.id}`}
                      className="mt-1 inline-block font-mono text-xs font-bold text-tci-negro underline-offset-2 hover:text-tci-rojo hover:underline"
                    >
                      {movimiento.orden.numero}
                    </Link>
                  )}
                </li>
              ))}
            </ul>

            {pagina && pagina.meta.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  onClick={() => irAPagina(pagina.meta.page - 1)}
                  disabled={pagina.meta.page <= 1}
                  className="rounded-lg border border-tci-borde bg-white px-4 py-2 text-sm font-semibold text-tci-negro hover:bg-tci-humo disabled:opacity-40"
                >
                  Anteriores
                </button>
                <p className="text-sm text-tci-gris">
                  Página {pagina.meta.page} de {pagina.meta.totalPages}
                </p>
                <button
                  onClick={() => irAPagina(pagina.meta.page + 1)}
                  disabled={pagina.meta.page >= pagina.meta.totalPages}
                  className="rounded-lg border border-tci-borde bg-white px-4 py-2 text-sm font-semibold text-tci-negro hover:bg-tci-humo disabled:opacity-40"
                >
                  Siguientes
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/**
 * La cantidad con su signo.
 *
 * El signo y el color van juntos, no solo el color: en una impresion en blanco
 * y negro una entrada y una salida se leerian igual.
 */
function Cantidad({ movimiento }: { movimiento: MovimientoInventario }) {
  const esEntrada = movimiento.tipo === "ENTRADA";
  return (
    <span
      className={`font-bold whitespace-nowrap ${
        esEntrada ? "text-emerald-700" : "text-tci-rojo"
      }`}
    >
      {esEntrada ? "+" : "−"}
      {formatearCantidad(movimiento.cantidad)}{" "}
      <span className="text-xs font-normal text-tci-gris">
        {movimiento.repuesto?.unidadMedida}
      </span>
    </span>
  );
}

function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-HN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Esqueleto() {
  return (
    <div className="space-y-3" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-xl border border-tci-borde bg-white"
        />
      ))}
    </div>
  );
}

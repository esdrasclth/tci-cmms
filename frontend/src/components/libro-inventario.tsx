"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Alerta } from "@/components/form";
import { Boton, EncabezadoPagina, Vacio, clasesBoton } from "@/components/ui";
import { SelectorBuscable } from "@/components/selector-buscable";
import { ApiError } from "@/lib/api";
import {
  buscarRepuestos,
  formatearCantidad,
  listarLibro,
  type FiltrosLibro,
  type MovimientoInventario,
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
  // El nombre del repuesto filtrado: ya no hay catalogo en memoria.
  const [repuestoTexto, setRepuestoTexto] = useState("");

  const buscarOpciones = useCallback(
    async (consulta: string) =>
      (await buscarRepuestos(consulta)).map((r) => ({
        valor: r.id,
        texto: `${r.codigo} — ${r.nombre}`,
      })),
    [],
  );
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <EncabezadoPagina
        titulo="Movimientos de almacén"
        descripcion="Todas las entradas y salidas, con quién las hizo y por qué."
        acciones={
          <>
            <Link
              href="/panel/repuestos"
              className={clasesBoton({ variante: "secundario" })}
            >
              Ver catálogo
            </Link>
          </>
        }
      />

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
          <SelectorBuscable
            id="repuesto"
            etiqueta="Repuesto"
            valor={filtros.repuestoId ?? ""}
            textoSeleccionado={repuestoTexto}
            onCambio={(v, texto) => {
              setRepuestoTexto(texto);
              cambiar({ repuestoId: v || undefined });
            }}
            buscar={buscarOpciones}
            placeholder="Todos"
          />
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
          <Vacio>No hay movimientos que coincidan con el filtro.</Vacio>
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
                <Boton
                  onClick={() => irAPagina(pagina.meta.page - 1)}
                  disabled={pagina.meta.page <= 1}
                  variante="secundario"
                >
                  Anteriores
                </Boton>
                <p className="text-sm text-tci-gris">
                  Página {pagina.meta.page} de {pagina.meta.totalPages}
                </p>
                <Boton
                  onClick={() => irAPagina(pagina.meta.page + 1)}
                  disabled={pagina.meta.page >= pagina.meta.totalPages}
                  variante="secundario"
                >
                  Siguientes
                </Boton>
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

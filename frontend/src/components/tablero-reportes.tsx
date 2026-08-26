"use client";

import { useCallback, useEffect, useState } from "react";

import { Alerta } from "@/components/form";
import { ApiError } from "@/lib/api";
import { ETIQUETA_ESTADO, ETIQUETA_PRIORIDAD } from "@/lib/ordenes";
import type { Estado, Prioridad } from "@/lib/ordenes";
import {
  descargarReporte,
  formatearDuracion,
  formatearLempiras,
  formatearNumero,
  mesActual,
  obtenerReporteTecnicos,
  obtenerResumen,
  type FilaTecnico,
  type Periodo,
  type ReporteTecnicos,
  type ResumenReportes,
} from "@/lib/reportes";

/**
 * TCI-58, TCI-59 y TCI-60 — tablero de indicadores y reporte por tecnico.
 *
 * Sobre las barras: cada grafico es **una sola serie** (cuantas ordenes hay en
 * cada estado, en cada tipo), o sea magnitud y no identidad. Por eso van todas
 * del mismo tono en vez de una paleta categorica —que ademas competiria con el
 * rojo institucional, unico acento de color de la aplicacion— y por eso no hay
 * leyenda: la etiqueta esta al lado de cada barra.
 *
 * Cada barra lleva su numero escrito. Con seis categorias como mucho, obligar a
 * medir a ojo contra un eje es peor que decirlo.
 */
export function TableroReportes() {
  const [periodo, setPeriodo] = useState<Periodo>(() => mesActual());
  const [resumen, setResumen] = useState<ResumenReportes | null>(null);
  const [tecnicos, setTecnicos] = useState<ReporteTecnicos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState<"csv" | "pdf" | null>(null);

  /**
   * El indicador de carga se enciende al cambiar el periodo y no dentro del
   * efecto: hacerlo ahi dispara un render de mas en cada montaje. Mismo patron
   * que `recargar` en las pantallas de gestion.
   */
  const cambiarPeriodo = useCallback((nuevo: Periodo) => {
    setCargando(true);
    setPeriodo(nuevo);
  }, []);

  useEffect(() => {
    let cancelado = false;
    Promise.all([obtenerResumen(periodo), obtenerReporteTecnicos(periodo)])
      .then(([r, t]) => {
        if (cancelado) return;
        setResumen(r);
        setTecnicos(t);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setError(
            e instanceof ApiError ? e.message : "No se pudo cargar el reporte.",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [periodo]);

  const exportar = useCallback(
    async (formato: "csv" | "pdf") => {
      setExportando(formato);
      setError(null);
      try {
        await descargarReporte(formato, periodo);
      } catch (e) {
        setError(
          e instanceof ApiError ? e.message : "No se pudo generar el archivo.",
        );
      } finally {
        setExportando(null);
      }
    },
    [periodo],
  );

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="tci-display text-2xl font-semibold text-tci-negro">
            Reportes
          </h1>
          <p className="mt-1 text-sm text-tci-gris">
            Indicadores del periodo y desempeño del equipo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void exportar("csv")}
            disabled={exportando !== null}
            className="rounded-lg border border-tci-borde bg-white px-4 py-2.5 text-sm font-semibold text-tci-negro hover:bg-tci-humo disabled:opacity-50"
          >
            {exportando === "csv" ? "Generando..." : "Exportar CSV"}
          </button>
          <button
            onClick={() => void exportar("pdf")}
            disabled={exportando !== null}
            className="rounded-lg bg-tci-rojo px-4 py-2.5 text-sm font-semibold text-white hover:bg-tci-rojo-hover disabled:opacity-50"
          >
            {exportando === "pdf" ? "Generando..." : "Exportar PDF"}
          </button>
        </div>
      </div>

      <FiltrosPeriodo periodo={periodo} onCambiar={cambiarPeriodo} />

      {error && (
        <div className="mt-4">
          <Alerta>{error}</Alerta>
        </div>
      )}

      {cargando && !resumen ? (
        <Esqueleto />
      ) : (
        resumen &&
        tecnicos && (
          <div className={cargando ? "opacity-50" : ""}>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Indicador
                etiqueta="Órdenes en el periodo"
                valor={formatearNumero(resumen.total)}
              />
              <Indicador
                etiqueta="Abiertas"
                valor={formatearNumero(resumen.abiertas)}
                nota={
                  resumen.total > 0
                    ? `${Math.round((resumen.abiertas / resumen.total) * 100)}% del total`
                    : undefined
                }
              />
              <Indicador
                etiqueta="Tiempo promedio de resolución"
                valor={formatearDuracion(resumen.diasPromedioResolucion)}
                nota="Del alta al cierre"
              />
              <Indicador
                etiqueta="Costo total"
                valor={formatearLempiras(resumen.costos.total)}
                nota={`Repuestos ${formatearLempiras(resumen.costos.repuestos)}`}
              />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Panel titulo="Órdenes por estado">
                <Barras
                  filas={ORDEN_ESTADOS.filter(
                    (estado) => (resumen.porEstado[estado] ?? 0) > 0,
                  ).map((estado) => ({
                    clave: estado,
                    etiqueta: ETIQUETA_ESTADO[estado],
                    valor: resumen.porEstado[estado] ?? 0,
                  }))}
                />
              </Panel>

              <Panel titulo="Órdenes por prioridad">
                <Barras
                  filas={ORDEN_PRIORIDADES.filter(
                    (p) => (resumen.porPrioridad[p] ?? 0) > 0,
                  ).map((prioridad) => ({
                    clave: prioridad,
                    etiqueta: ETIQUETA_PRIORIDAD[prioridad],
                    valor: resumen.porPrioridad[prioridad] ?? 0,
                  }))}
                />
              </Panel>
            </div>

            <div className="mt-6">
              <Panel titulo="Órdenes por tipo de mantenimiento">
                <Barras
                  filas={resumen.porTipo.map((tipo) => ({
                    clave: tipo.id,
                    etiqueta: tipo.nombre,
                    valor: tipo.ordenes,
                    // El color del tipo lo elige el administrador y puede ser
                    // cualquiera: entra como marca de identidad al lado de la
                    // etiqueta, nunca como relleno de la barra, donde un color
                    // claro dejaria de leerse sobre blanco.
                    marca: tipo.color,
                  }))}
                />
              </Panel>
            </div>

            <div className="mt-6">
              <TablaTecnicos tecnicos={tecnicos.tecnicos} />
            </div>
          </div>
        )
      )}
    </section>
  );
}

/** El orden es el del flujo de la orden, no el alfabetico ni el de tamano. */
const ORDEN_ESTADOS: Estado[] = [
  "PENDIENTE",
  "ASIGNADA",
  "EN_PROCESO",
  "EN_ESPERA",
  "COMPLETADA",
  "CANCELADA",
];

const ORDEN_PRIORIDADES: Prioridad[] = ["URGENTE", "ALTA", "MEDIA", "BAJA"];

function FiltrosPeriodo({
  periodo,
  onCambiar,
}: {
  periodo: Periodo;
  onCambiar: (periodo: Periodo) => void;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border border-tci-borde bg-white p-4">
      <div>
        <label htmlFor="desde" className="mb-1 block text-xs text-tci-gris">
          Desde
        </label>
        <input
          id="desde"
          type="date"
          value={periodo.desde ?? ""}
          onChange={(e) =>
            onCambiar({ ...periodo, desde: e.target.value || undefined })
          }
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
          value={periodo.hasta ?? ""}
          onChange={(e) =>
            onCambiar({ ...periodo, hasta: e.target.value || undefined })
          }
          className="rounded-lg border border-tci-borde px-3 py-2 text-sm text-tci-negro focus:border-tci-rojo focus:outline-none"
        />
      </div>
      <button
        onClick={() => onCambiar(mesActual())}
        className="rounded-lg border border-tci-borde px-3 py-2 text-sm font-semibold text-tci-negro hover:bg-tci-humo"
      >
        Este mes
      </button>
      <button
        onClick={() => onCambiar({})}
        className="rounded-lg border border-tci-borde px-3 py-2 text-sm font-semibold text-tci-negro hover:bg-tci-humo"
      >
        Todo el historial
      </button>
    </div>
  );
}

/** Numero grande. No es un grafico: un solo valor no necesita serlo. */
function Indicador({
  etiqueta,
  valor,
  nota,
}: {
  etiqueta: string;
  valor: string;
  nota?: string;
}) {
  return (
    <div className="rounded-xl border border-tci-borde bg-white p-4">
      <p className="text-xs font-semibold tracking-wide text-tci-gris uppercase">
        {etiqueta}
      </p>
      <p className="tci-display mt-2 text-3xl font-semibold text-tci-negro">
        {valor}
      </p>
      {nota && <p className="mt-1 text-xs text-tci-gris">{nota}</p>}
    </div>
  );
}

function Panel({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-tci-borde bg-white p-5">
      <h2 className="text-sm font-semibold tracking-wide text-tci-gris uppercase">
        {titulo}
      </h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/**
 * Barras horizontales de una sola serie.
 *
 * Horizontales y no verticales porque las etiquetas son palabras —"En proceso",
 * "Mantenimiento correctivo"— y en vertical habria que girarlas o truncarlas.
 * La escala es al maximo de la serie, no al total: comparar entre si es la
 * pregunta, y contra el total ya esta el indicador de arriba.
 */
function Barras({
  filas,
}: {
  filas: { clave: string; etiqueta: string; valor: number; marca?: string | null }[];
}) {
  if (filas.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-tci-gris">
        Sin órdenes en el periodo.
      </p>
    );
  }

  const maximo = Math.max(...filas.map((f) => f.valor));

  return (
    <ul className="space-y-3">
      {filas.map((fila) => (
        <li key={fila.clave}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-sm text-tci-grafito">
              {fila.marca && (
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: fila.marca }}
                />
              )}
              <span className="truncate">{fila.etiqueta}</span>
            </span>
            <span className="shrink-0 text-sm font-bold text-tci-negro">
              {formatearNumero(fila.valor)}
            </span>
          </div>
          <div
            className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-tci-humo"
            role="img"
            aria-label={`${fila.etiqueta}: ${fila.valor}`}
          >
            <div
              className="h-full rounded-full bg-tci-grafito"
              style={{ width: `${maximo > 0 ? (fila.valor / maximo) * 100 : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** TCI-58. Es una tabla y no un grafico: son seis medidas por tecnico. */
function TablaTecnicos({ tecnicos }: { tecnicos: FilaTecnico[] }) {
  if (tecnicos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-tci-borde bg-white p-8 text-center text-sm text-tci-grafito">
        No hay técnicos registrados.
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-semibold tracking-wide text-tci-gris uppercase">
        Desempeño por técnico
      </h2>

      {/* Tabla en escritorio, tarjetas en movil (TCI-44). */}
      <div className="mt-3 hidden overflow-x-auto rounded-xl border border-tci-borde bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-tci-borde bg-tci-humo text-xs text-tci-gris uppercase">
            <tr>
              <th className="px-4 py-3 font-bold">Técnico</th>
              <th className="px-4 py-3 font-bold">Total</th>
              <th className="px-4 py-3 font-bold">Abiertas</th>
              <th className="px-4 py-3 font-bold">Completadas</th>
              <th className="px-4 py-3 font-bold">Horas</th>
              <th className="px-4 py-3 font-bold">Tiempo prom.</th>
              <th className="px-4 py-3 font-bold">Costo</th>
            </tr>
          </thead>
          <tbody>
            {tecnicos.map((fila) => (
              <tr
                key={fila.id}
                className="border-b border-tci-borde last:border-0"
              >
                <td className="px-4 py-3">
                  <p className="font-bold text-tci-negro">{fila.nombre}</p>
                  <p className="text-xs text-tci-gris">{fila.correo}</p>
                </td>
                <td className="px-4 py-3 text-tci-grafito">{fila.total}</td>
                <td className="px-4 py-3 text-tci-grafito">{fila.abiertas}</td>
                <td className="px-4 py-3 text-tci-grafito">
                  {fila.completadas}
                </td>
                <td className="px-4 py-3 text-tci-grafito">
                  {formatearNumero(fila.horas, 1)}
                </td>
                <td className="px-4 py-3 text-tci-grafito">
                  {formatearDuracion(fila.diasPromedioResolucion)}
                </td>
                <td className="px-4 py-3 text-tci-grafito">
                  {formatearLempiras(fila.costoTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-3 space-y-3 md:hidden">
        {tecnicos.map((fila) => (
          <li
            key={fila.id}
            className="rounded-xl border border-tci-borde bg-white p-4"
          >
            <p className="font-bold text-tci-negro">{fila.nombre}</p>
            <p className="text-xs text-tci-gris">{fila.correo}</p>
            <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <Dato etiqueta="Total" valor={String(fila.total)} />
              <Dato etiqueta="Abiertas" valor={String(fila.abiertas)} />
              <Dato etiqueta="Cerradas" valor={String(fila.completadas)} />
              <Dato
                etiqueta="Horas"
                valor={formatearNumero(fila.horas, 1)}
              />
              <Dato
                etiqueta="Tiempo prom."
                valor={formatearDuracion(fila.diasPromedioResolucion)}
              />
              <Dato
                etiqueta="Costo"
                valor={formatearLempiras(fila.costoTotal)}
              />
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-tci-gris">{etiqueta}</dt>
      <dd className="font-bold text-tci-negro">{valor}</dd>
    </div>
  );
}

function Esqueleto() {
  return (
    <div className="mt-6 space-y-4" aria-hidden>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-tci-borde bg-white"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border border-tci-borde bg-white" />
    </div>
  );
}

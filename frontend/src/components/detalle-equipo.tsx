"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import {
  COLOR_ESTADO,
  COLOR_PRIORIDAD,
  ETIQUETA_ESTADO,
  ETIQUETA_PRIORIDAD,
  formatearFecha,
} from "@/lib/ordenes";
import {
  formatearDuracion,
  formatearNumero,
  obtenerHistorialEquipo,
  type HistorialEquipo,
} from "@/lib/reportes";

/**
 * TCI-57 — historial de mantenimiento de un equipo.
 *
 * Hasta TCI-38 esto reutilizaba `GET /api/ordenes?equipoId=`, que aplica el
 * aislamiento por rol: **un tecnico veia aqui solo sus propias ordenes**. Desde
 * TCI-57 usa `GET /api/equipos/:id/historial`, que devuelve las de todos.
 *
 * El motivo es el diagnostico: media maquina no se arregla con medio historial,
 * y saber que "esto ya fallo en marzo y lo atendio otro" es justo lo que evita
 * repetir el trabajo. Decision del cliente del 2026-08-26. La contrapartida es
 * que la proyeccion se acota —sin costos— y para el detalle de una orden ajena
 * sigue mandando el permiso de siempre.
 */
export function DetalleEquipo({ id }: { id: string }) {
  const [historial, setHistorial] = useState<HistorialEquipo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    obtenerHistorialEquipo(id)
      .then((datos) => {
        if (cancelado) return;
        setHistorial(datos);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setError(
            e instanceof ApiError ? e.message : "No se pudo cargar el equipo.",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [id]);

  if (cargando) {
    return <p className="text-sm text-tci-gris">Cargando equipo...</p>;
  }

  if (error || !historial) {
    return (
      <div className="rounded-xl border border-dashed border-tci-borde bg-white p-8 text-center">
        <p className="text-tci-rojo">{error ?? "No se encontro el equipo."}</p>
        <Link
          href="/panel/equipos"
          className="mt-3 inline-block text-sm font-bold text-tci-negro underline-offset-2 hover:text-tci-rojo hover:underline"
        >
          &larr; Volver a equipos
        </Link>
      </div>
    );
  }

  const { equipo, resumen, ordenes } = historial;

  // Ultimo mantenimiento efectivo: la orden completada mas reciente. La lista
  // ya viene ordenada por fecha descendente, asi que la primera que aparezca
  // es la buena.
  const ultimaCompletada = ordenes.find((o) => o.estado === "COMPLETADA");

  // Del resumen, que cuenta sobre TODO el historial y no solo sobre las que
  // caben en la lista.
  const abiertas = (["PENDIENTE", "ASIGNADA", "EN_PROCESO", "EN_ESPERA"] as const)
    .map((estado) => resumen.porEstado[estado] ?? 0)
    .reduce((suma, n) => suma + n, 0);

  return (
    <div>
      <Link
        href="/panel/equipos"
        className="text-sm text-tci-gris underline-offset-2 hover:text-tci-rojo hover:underline"
      >
        &larr; Volver a equipos
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-tci-gris">{equipo.codigo}</p>
          <h1 className="text-2xl font-bold text-tci-negro">
            {equipo.nombre}
            {!equipo.activo && (
              <span className="ml-3 rounded-full bg-tci-humo px-3 py-1 text-xs font-normal text-tci-gris">
                Desactivado
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-tci-grafito">
            {equipo.cliente.nombre}
            {equipo.sede && ` · ${equipo.sede.nombre}`}
          </p>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-xl border border-tci-borde bg-white p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-sm font-bold text-tci-negro uppercase">
              Historial de ordenes
            </h2>
            <p className="text-sm text-tci-gris">
              {resumen.total} {resumen.total === 1 ? "orden" : "ordenes"}
            </p>
          </div>

          {ordenes.length === 0 ? (
            <p className="mt-4 text-sm text-tci-grafito">
              Este equipo no tiene ordenes registradas.
            </p>
          ) : (
            <>
              <ul className="mt-4 divide-y divide-tci-borde">
                {ordenes.map((orden) => (
                  <li key={orden.id} className="py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/panel/ordenes/${orden.id}`}
                          className="font-bold text-tci-negro underline-offset-2 hover:text-tci-rojo hover:underline"
                        >
                          {orden.titulo}
                        </Link>
                        <p className="text-xs text-tci-gris">
                          <span className="font-mono">{orden.numero}</span> ·{" "}
                          {orden.tipoMantenimiento.nombre}
                          {orden.tecnico && ` · ${orden.tecnico.name}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span
                          className={`text-xs ${COLOR_PRIORIDAD[orden.prioridad]}`}
                        >
                          {ETIQUETA_PRIORIDAD[orden.prioridad]}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${COLOR_ESTADO[orden.estado]}`}
                        >
                          {ETIQUETA_ESTADO[orden.estado]}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {historial.truncado && (
                <p className="mt-3 text-xs text-tci-gris">
                  Se muestran las {ordenes.length} mas recientes.{" "}
                  <Link
                    href="/panel"
                    className="font-bold underline-offset-2 hover:text-tci-rojo hover:underline"
                  >
                    Ver todas en el listado
                  </Link>
                </p>
              )}
            </>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-xl border border-tci-borde bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-tci-negro uppercase">
              Resumen
            </h2>
            <dl className="space-y-3 text-sm">
              <Dato
                etiqueta="Ultimo mantenimiento"
                valor={
                  ultimaCompletada
                    ? formatearFecha(ultimaCompletada.fechaProgramada) !== "—"
                      ? formatearFecha(ultimaCompletada.fechaProgramada)
                      : formatearFecha(ultimaCompletada.createdAt)
                    : "Nunca"
                }
              />
              <Dato etiqueta="Ordenes abiertas" valor={String(abiertas)} />
              <Dato etiqueta="Total historico" valor={String(resumen.total)} />
              <Dato
                etiqueta="Horas acumuladas"
                valor={formatearNumero(resumen.horasTotales, 1)}
              />
              <Dato
                etiqueta="Tiempo promedio de cierre"
                valor={formatearDuracion(resumen.diasPromedioResolucion)}
              />
            </dl>
          </section>

          <section className="rounded-xl border border-tci-borde bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-tci-negro uppercase">
              Ficha
            </h2>
            <dl className="space-y-3 text-sm">
              <Dato etiqueta="Tipo" valor={equipo.tipo ?? "—"} />
              <Dato etiqueta="Marca" valor={equipo.marca ?? "—"} />
              <Dato etiqueta="Modelo" valor={equipo.modelo ?? "—"} />
              <Dato etiqueta="Serie" valor={equipo.numeroSerie ?? "—"} />
              <Dato
                etiqueta="Ubicacion"
                valor={equipo.ubicacionFisica ?? "—"}
              />
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-tci-gris">{etiqueta}</dt>
      <dd className="text-right font-bold text-tci-grafito">{valor}</dd>
    </div>
  );
}

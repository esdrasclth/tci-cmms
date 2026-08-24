"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { obtenerEquipo, type Equipo } from "@/lib/equipos";
import {
  COLOR_ESTADO,
  COLOR_PRIORIDAD,
  ETIQUETA_ESTADO,
  ETIQUETA_PRIORIDAD,
  formatearFecha,
  listarOrdenes,
  type OrdenListada,
} from "@/lib/ordenes";

const POR_PAGINA = 25;

/**
 * TCI-38 — historial de ordenes de un equipo.
 *
 * No hace falta endpoint nuevo: `GET /api/ordenes?equipoId=` ya filtra y, de
 * paso, aplica el aislamiento por rol. Eso significa que **un tecnico ve aqui
 * solo sus propias ordenes sobre el equipo**, no todas.
 *
 * Es lo consistente con el resto del sistema, pero discutible para trabajo de
 * campo: el historial completo de una maquina es justo lo que ayuda a
 * diagnosticarla. Si TCI quiere abrirlo, el cambio es quitar el filtro por
 * tecnico solo para esta consulta, y encaja mejor con TCI-57 (historial de
 * mantenimiento por activo), que es la vista de reportes.
 */
export function DetalleEquipo({ id }: { id: string }) {
  const { data: sesion } = useSession();
  const esAdmin = sesion?.user.rol === "ADMIN";

  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [ordenes, setOrdenes] = useState<OrdenListada[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    Promise.all([
      obtenerEquipo(id),
      listarOrdenes({ equipoId: id, perPage: POR_PAGINA }),
    ])
      .then(([equipoApi, pagina]) => {
        if (cancelado) return;
        setEquipo(equipoApi);
        setOrdenes(pagina.data);
        setTotal(pagina.meta.total);
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

  if (error || !equipo) {
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

  // Ultimo mantenimiento efectivo: la orden completada mas reciente. Se calcula
  // aqui porque la lista ya viene ordenada por fecha descendente.
  const ultimaCompletada = ordenes.find((o) => o.estado === "COMPLETADA");
  const abiertas = ordenes.filter(
    (o) => o.estado !== "COMPLETADA" && o.estado !== "CANCELADA",
  ).length;

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
              {total} {total === 1 ? "orden" : "ordenes"}
            </p>
          </div>

          {!esAdmin && (
            <p className="mt-3 rounded-lg bg-tci-humo px-4 py-2.5 text-xs text-tci-gris">
              Se muestran unicamente las ordenes asignadas a usted.
            </p>
          )}

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

              {total > ordenes.length && (
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
              <Dato
                etiqueta="Total historico"
                valor={String(equipo._count.ordenes)}
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

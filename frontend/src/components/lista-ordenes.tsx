"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { Boton } from "@/components/ui";
import {
  COLOR_ESTADO,
  COLOR_PRIORIDAD,
  ESTADOS,
  ETIQUETA_ESTADO,
  ETIQUETA_PRIORIDAD,
  type Estado,
  type OrdenListada,
  type PaginaOrdenes,
  formatearFecha,
  listarOrdenes,
} from "@/lib/ordenes";

const POR_PAGINA = 10;

/**
 * TCI-41 — listado de ordenes.
 *
 * Es la misma vista para los dos roles: el backend ya decide que se ve. Un
 * tecnico solo recibe las suyas aunque pida otra cosa (regla 3 de
 * docs/flujo-ordenes.md), asi que aqui no hay que filtrar nada por seguridad;
 * lo unico que cambia es el texto y que al admin se le muestra la columna de
 * tecnico asignado.
 */
export function ListaOrdenes({ esAdmin }: { esAdmin: boolean }) {
  const [pagina, setPagina] = useState<PaginaOrdenes | null>(null);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [nroPagina, setNroPagina] = useState(1);
  const [intento, setIntento] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // El estado de carga lo enciende la accion que dispara la peticion (filtro,
  // paginacion, reintento), no el efecto: encenderlo aqui seria un setState
  // sincrono dentro del efecto, que React desaconseja.
  useEffect(() => {
    let cancelado = false;

    listarOrdenes({
      estado: estados.length ? estados : undefined,
      page: nroPagina,
      perPage: POR_PAGINA,
    })
      .then((resultado) => {
        // Si el usuario cambio de filtro mientras esto viajaba, la respuesta
        // vieja podria pisar a la nueva.
        if (cancelado) return;
        setPagina(resultado);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelado) return;
        setError(
          e instanceof ApiError ? e.message : "No se pudo cargar el listado.",
        );
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [estados, nroPagina, intento]);

  const recargar = useCallback(() => {
    setCargando(true);
    setIntento((n) => n + 1);
  }, []);

  const irAPagina = useCallback((n: number) => {
    setCargando(true);
    setNroPagina(n);
  }, []);

  function alternarEstado(estado: Estado) {
    setCargando(true);
    setNroPagina(1); // cambiar el filtro invalida la pagina actual
    setEstados((actuales) =>
      actuales.includes(estado)
        ? actuales.filter((e) => e !== estado)
        : [...actuales, estado],
    );
  }

  return (
    <section>
      {/* El titulo y el alta los pone la pagina, como en el resto de pantallas
          de gestion. Aqui el recuento acompana a los filtros, que es lo que
          modifica: al pulsar un estado, el numero de al lado cambia. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex flex-wrap gap-2">
          {ESTADOS.map((estado) => {
            const activo = estados.includes(estado);
            return (
              <button
                key={estado}
                onClick={() => alternarEstado(estado)}
                aria-pressed={activo}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                  activo
                    ? "border-tci-rojo bg-tci-rojo text-white"
                    : "border-tci-borde bg-white text-tci-grafito hover:border-tci-gris"
                }`}
              >
                {ETIQUETA_ESTADO[estado]}
              </button>
            );
          })}
          {estados.length > 0 && (
            <button
              onClick={() => {
                setCargando(true);
                setEstados([]);
                setNroPagina(1);
              }}
              className="px-2 py-1.5 text-xs text-tci-gris underline-offset-2 hover:text-tci-rojo hover:underline"
            >
              Limpiar
            </button>
          )}
        </div>

        {pagina && !cargando && (
          <p className="text-sm text-tci-gris">
            {pagina.meta.total} {pagina.meta.total === 1 ? "orden" : "órdenes"}
          </p>
        )}
      </div>

      <div className="mt-5">
        {error ? (
          <Aviso>
            <p className="text-tci-rojo">{error}</p>
            <Boton onClick={recargar} variante="secundario" className="mt-3">
              Reintentar
            </Boton>
          </Aviso>
        ) : cargando ? (
          <Esqueleto />
        ) : !pagina || pagina.data.length === 0 ? (
          <Aviso>
            <p className="text-sm text-tci-grafito">
              {estados.length > 0
                ? "Ninguna orden coincide con el filtro."
                : esAdmin
                  ? "Todavía no hay órdenes registradas."
                  : "No tiene órdenes asignadas."}
            </p>
          </Aviso>
        ) : (
          <>
            {/* Escritorio: tabla. */}
            <div className="hidden overflow-x-auto rounded-xl border border-tci-borde bg-white md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-tci-borde bg-tci-humo text-xs text-tci-gris uppercase">
                  <tr>
                    <th className="px-4 py-3 font-bold">Número</th>
                    <th className="px-4 py-3 font-bold">Orden</th>
                    <th className="px-4 py-3 font-bold">Cliente</th>
                    <th className="px-4 py-3 font-bold">Estado</th>
                    <th className="px-4 py-3 font-bold">Prioridad</th>
                    {esAdmin && (
                      <th className="px-4 py-3 font-bold">Técnico</th>
                    )}
                    <th className="px-4 py-3 font-bold">Programada</th>
                  </tr>
                </thead>
                <tbody>
                  {pagina.data.map((orden) => (
                    <tr
                      key={orden.id}
                      className="border-b border-tci-borde last:border-0 hover:bg-tci-humo"
                    >
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-tci-gris">
                        {orden.numero}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/panel/ordenes/${orden.id}`}
                          className="font-bold text-tci-negro underline-offset-2 hover:text-tci-rojo hover:underline"
                        >
                          {orden.titulo}
                        </Link>
                        <p className="text-xs text-tci-gris">
                          {orden.tipoMantenimiento.nombre}
                          {orden.equipo && ` · ${orden.equipo.codigo}`}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-tci-grafito">
                        {orden.cliente.nombre}
                        {orden.sede && (
                          <span className="block text-xs text-tci-gris">
                            {orden.sede.nombre}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <InsigniaEstado estado={orden.estado} />
                      </td>
                      <td
                        className={`px-4 py-3 text-xs ${COLOR_PRIORIDAD[orden.prioridad]}`}
                      >
                        {ETIQUETA_PRIORIDAD[orden.prioridad]}
                      </td>
                      {esAdmin && (
                        <td className="px-4 py-3 text-tci-grafito">
                          {orden.tecnico?.name ?? (
                            <span className="text-tci-gris">Sin asignar</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap text-tci-grafito">
                        {formatearFecha(orden.fechaProgramada)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Movil: tarjetas. El tecnico consulta esto en campo (TCI-44). */}
            <ul className="space-y-3 md:hidden">
              {pagina.data.map((orden) => (
                <li key={orden.id}>
                  <Link
                    href={`/panel/ordenes/${orden.id}`}
                    className="block rounded-xl border border-tci-borde bg-white p-4 hover:border-tci-gris"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-mono text-xs text-tci-gris">
                        {orden.numero}
                      </span>
                      <InsigniaEstado estado={orden.estado} />
                    </div>
                    <p className="mt-2 font-bold text-tci-negro">
                      {orden.titulo}
                    </p>
                    <p className="text-sm text-tci-grafito">
                      {orden.cliente.nombre}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-tci-gris">
                      <span className={COLOR_PRIORIDAD[orden.prioridad]}>
                        {ETIQUETA_PRIORIDAD[orden.prioridad]}
                      </span>
                      <span>{formatearFecha(orden.fechaProgramada)}</span>
                      {esAdmin && (
                        <span>{orden.tecnico?.name ?? "Sin asignar"}</span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {pagina.meta.totalPages > 1 && (
              <Paginacion
                pagina={pagina}
                onCambiar={irAPagina}
                deshabilitado={cargando}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}

function InsigniaEstado({ estado }: { estado: OrdenListada["estado"] }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${COLOR_ESTADO[estado]}`}
    >
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}

function Paginacion({
  pagina,
  onCambiar,
  deshabilitado,
}: {
  pagina: PaginaOrdenes;
  onCambiar: (n: number) => void;
  deshabilitado: boolean;
}) {
  const { page, totalPages } = pagina.meta;
  const clases =
    "rounded-lg border border-tci-borde px-3 py-1.5 text-sm font-bold text-tci-negro " +
    "hover:bg-tci-humo disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <button
        onClick={() => onCambiar(page - 1)}
        disabled={deshabilitado || page <= 1}
        className={clases}
      >
        Anterior
      </button>
      <span className="text-sm text-tci-gris">
        Pagina {page} de {totalPages}
      </span>
      <button
        onClick={() => onCambiar(page + 1)}
        disabled={deshabilitado || page >= totalPages}
        className={clases}
      >
        Siguiente
      </button>
    </div>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-tci-borde bg-white p-8 text-center">
      {children}
    </div>
  );
}

function Esqueleto() {
  return (
    <div className="space-y-2" aria-busy aria-label="Cargando ordenes">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl border border-tci-borde bg-white"
        />
      ))}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Alerta } from "@/components/form";
import { Boton, Insignia } from "@/components/ui";
import { ApiError } from "@/lib/api";
import {
  DIAS_SEMANA,
  celdasDelMes,
  claveDia,
  rangoDeLaRejilla,
} from "@/lib/calendario";
import {
  COLOR_ESTADO,
  ETIQUETA_ESTADO,
  listarOrdenes,
  type OrdenListada,
} from "@/lib/ordenes";

/** Tope del backend. Un mes con mas de esto es improbable, pero se avisa. */
const POR_MES = 100;

/**
 * Vista de calendario de las ordenes programadas.
 *
 * Responde a una pregunta que el listado no contesta bien: **que hay esta
 * semana y quien lo lleva**. En una tabla ordenada por fecha eso exige leer
 * fila por fila; en una rejilla se ve de un vistazo.
 *
 * Las ordenes se colocan por `fechaProgramada`, que es cuando esta previsto
 * hacer el trabajo. Si ademas tienen `fechaLimite` dentro del mes, ese dia
 * lleva su propia marca: son dos fechas distintas —cuando se hace y cuando
 * vence— y mezclarlas en una sola casilla haria creer que el plazo es el dia
 * del trabajo.
 *
 * **Una orden sin fecha programada no aparece.** No es un descuido: el
 * calendario muestra lo que esta agendado, y una orden sin fecha es
 * precisamente lo que todavia no lo esta. Para esas esta el listado.
 */
export function CalendarioOrdenes({ esAdmin }: { esAdmin: boolean }) {
  const [mes, setMes] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });
  const [error, setError] = useState<string | null>(null);
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null);
  /**
   * Se guarda junto al mes al que corresponde. De ahi sale "cargando" sin un
   * estado aparte: si lo guardado no es del mes que se mira, aun no ha
   * llegado. Un `setCargando` en el efecto seria el `setState` sincrono que
   * React desaconseja.
   */
  const [datos, setDatos] = useState<{
    mes: string;
    ordenes: OrdenListada[];
    total: number;
  } | null>(null);

  const claveMes = `${mes.getFullYear()}-${mes.getMonth()}`;
  const cargando = datos?.mes !== claveMes;

  useEffect(() => {
    let cancelado = false;
    const { desde, hasta } = rangoDeLaRejilla(mes);
    const clave = `${mes.getFullYear()}-${mes.getMonth()}`;

    listarOrdenes({ desde, hasta, perPage: POR_MES })
      .then((pagina) => {
        if (cancelado) return;
        setDatos({
          mes: clave,
          ordenes: pagina.data,
          total: pagina.meta.total,
        });
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelado) return;
        setDatos({ mes: clave, ordenes: [], total: 0 });
        setError(
          e instanceof ApiError ? e.message : "No se pudo cargar el mes.",
        );
      });
    return () => {
      cancelado = true;
    };
  }, [mes]);

  const ordenes = useMemo(() => datos?.ordenes ?? [], [datos]);

  /** Que cae en cada dia: el trabajo previsto y, aparte, los plazos. */
  const porDia = useMemo(() => {
    const mapa = new Map<
      string,
      { programadas: OrdenListada[]; limites: OrdenListada[] }
    >();
    const anotar = (
      clave: string,
      orden: OrdenListada,
      donde: "programadas" | "limites",
    ) => {
      const entrada = mapa.get(clave) ?? { programadas: [], limites: [] };
      entrada[donde].push(orden);
      mapa.set(clave, entrada);
    };

    for (const orden of ordenes) {
      if (orden.fechaProgramada) {
        anotar(claveDia(new Date(orden.fechaProgramada)), orden, "programadas");
      }
      if (orden.fechaLimite) {
        const clave = claveDia(new Date(orden.fechaLimite));
        // Solo si cae en otro dia: si coinciden, la marca de plazo sobra.
        if (
          !orden.fechaProgramada ||
          clave !== claveDia(new Date(orden.fechaProgramada))
        ) {
          anotar(clave, orden, "limites");
        }
      }
    }
    return mapa;
  }, [ordenes]);

  const dias = useMemo(() => celdasDelMes(mes), [mes]);
  const hoy = claveDia(new Date());
  const abierto = diaAbierto ? porDia.get(diaAbierto) : undefined;

  function cambiarMes(salto: number) {
    setDiaAbierto(null);
    setMes((a) => new Date(a.getFullYear(), a.getMonth() + salto, 1));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Boton
            tamano="sm"
            variante="secundario"
            onClick={() => cambiarMes(-1)}
            aria-label="Mes anterior"
          >
            &larr;
          </Boton>
          <p className="min-w-40 text-center text-sm font-semibold text-tci-negro">
            {mes.toLocaleDateString("es-HN", {
              month: "long",
              year: "numeric",
            })}
          </p>
          <Boton
            tamano="sm"
            variante="secundario"
            onClick={() => cambiarMes(1)}
            aria-label="Mes siguiente"
          >
            &rarr;
          </Boton>
          <Boton
            tamano="sm"
            variante="secundario"
            onClick={() => {
              const h = new Date();
              setDiaAbierto(null);
              setMes(new Date(h.getFullYear(), h.getMonth(), 1));
            }}
          >
            Hoy
          </Boton>
        </div>

        <p className="text-sm text-tci-gris">
          {cargando
            ? "Cargando..."
            : ordenes.length === 1
              ? "1 orden programada"
              : `${ordenes.length} órdenes programadas`}
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <Alerta>{error}</Alerta>
        </div>
      )}

      {!cargando && datos && datos.total > ordenes.length && (
        <p className="mb-4 rounded-lg bg-tci-humo px-4 py-3 text-sm text-tci-gris">
          Este mes tiene {datos.total} órdenes y se muestran las primeras{" "}
          {ordenes.length}. Use el listado con filtros para verlas todas.
        </p>
      )}

      {/* Escritorio: la rejilla. En movil los siete dias no caben sin encoger
          hasta que no se lee nada, asi que ahi va la lista (TCI-44). */}
      <div
        className={`hidden md:block ${cargando ? "opacity-50" : ""}`}
        role="grid"
        aria-label="Órdenes del mes"
      >
        <div className="grid grid-cols-7 gap-px rounded-t-xl border border-tci-borde bg-tci-borde text-center text-xs font-semibold text-tci-gris uppercase">
          {DIAS_SEMANA.map((dia) => (
            <div key={dia} className="bg-tci-humo py-2">
              {dia}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px rounded-b-xl border border-t-0 border-tci-borde bg-tci-borde">
          {dias.map((dia) => {
            const clave = claveDia(dia.fecha);
            const contenido = porDia.get(clave);
            return (
              <Celda
                key={clave}
                fecha={dia.fecha}
                delMes={dia.delMes}
                esHoy={clave === hoy}
                programadas={contenido?.programadas ?? []}
                limites={contenido?.limites ?? []}
                esAdmin={esAdmin}
                abierto={diaAbierto === clave}
                onAbrir={() =>
                  setDiaAbierto((a) => (a === clave ? null : clave))
                }
              />
            );
          })}
        </div>
      </div>

      {/* El detalle del dia elegido, debajo de la rejilla. */}
      {abierto && (
        <div className="mt-4 hidden rounded-xl border border-tci-borde bg-white p-4 md:block">
          <h3 className="text-sm font-semibold text-tci-negro">
            {new Date(diaAbierto + "T12:00:00").toLocaleDateString("es-HN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h3>
          <ul className="mt-3 space-y-2">
            {[
              ...abierto.programadas.map((o) => ({ orden: o, plazo: false })),
              ...abierto.limites.map((o) => ({ orden: o, plazo: true })),
            ].map(({ orden, plazo }) => (
              <li key={`${orden.id}-${plazo ? "l" : "p"}`}>
                <Fila orden={orden} plazo={plazo} esAdmin={esAdmin} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Movil: solo los dias con algo, en lista. */}
      <div className={`md:hidden ${cargando ? "opacity-50" : ""}`}>
        {[...porDia.entries()]
          .filter(([clave]) =>
            dias.some((d) => claveDia(d.fecha) === clave && d.delMes),
          )
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([clave, contenido]) => (
            <div key={clave} className="mb-4">
              <p
                className={`mb-2 text-sm font-semibold ${
                  clave === hoy ? "text-tci-rojo" : "text-tci-negro"
                }`}
              >
                {new Date(clave + "T12:00:00").toLocaleDateString("es-HN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <ul className="space-y-2">
                {[
                  ...contenido.programadas.map((o) => ({
                    orden: o,
                    plazo: false,
                  })),
                  ...contenido.limites.map((o) => ({ orden: o, plazo: true })),
                ].map(({ orden, plazo }) => (
                  <li key={`${orden.id}-${plazo ? "l" : "p"}`}>
                    <Fila orden={orden} plazo={plazo} esAdmin={esAdmin} />
                  </li>
                ))}
              </ul>
            </div>
          ))}

        {!cargando && porDia.size === 0 && (
          <p className="rounded-xl border border-dashed border-tci-borde bg-white p-8 text-center text-sm text-tci-grafito">
            Ninguna orden programada este mes.
          </p>
        )}
      </div>
    </div>
  );
}

function Celda({
  fecha,
  delMes,
  esHoy,
  programadas,
  limites,
  esAdmin,
  abierto,
  onAbrir,
}: {
  fecha: Date;
  delMes: boolean;
  esHoy: boolean;
  programadas: OrdenListada[];
  limites: OrdenListada[];
  esAdmin: boolean;
  abierto: boolean;
  onAbrir: () => void;
}) {
  const total = programadas.length + limites.length;
  // Tres caben sin que la celda crezca y descuadre la semana entera.
  const visibles = programadas.slice(0, 3);
  const resto = total - visibles.length;

  return (
    <button
      type="button"
      onClick={onAbrir}
      disabled={total === 0}
      aria-label={`${fecha.getDate()}: ${total} orden(es)`}
      className={`min-h-24 p-1.5 text-left align-top transition-colors disabled:cursor-default ${
        delMes ? "bg-white" : "bg-tci-humo/60"
      } ${abierto ? "ring-2 ring-tci-rojo ring-inset" : ""} ${
        total > 0 ? "hover:bg-tci-humo" : ""
      }`}
    >
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums ${
          esHoy
            ? "bg-tci-rojo font-bold text-white"
            : delMes
              ? "text-tci-grafito"
              : "text-tci-gris"
        }`}
      >
        {fecha.getDate()}
      </span>

      <span className="mt-1 block space-y-1">
        {visibles.map((orden) => (
          <span
            key={orden.id}
            className={`block truncate rounded px-1 py-0.5 text-[0.6875rem] leading-tight ${COLOR_ESTADO[orden.estado]}`}
          >
            {orden.titulo}
            {esAdmin && (
              <span className="block truncate opacity-75">
                {orden.tecnico?.name ?? "Sin asignar"}
              </span>
            )}
          </span>
        ))}

        {limites.length > 0 && visibles.length < 3 && (
          <span className="block truncate rounded border border-tci-rojo/40 px-1 py-0.5 text-[0.6875rem] leading-tight text-tci-rojo">
            {limites.length === 1
              ? "1 vence hoy"
              : `${limites.length} vencen hoy`}
          </span>
        )}

        {resto > 0 && (
          <span className="block px-1 text-[0.6875rem] text-tci-gris">
            +{resto} más
          </span>
        )}
      </span>
    </button>
  );
}

/** Una orden dentro del detalle de un dia. */
function Fila({
  orden,
  plazo,
  esAdmin,
}: {
  orden: OrdenListada;
  /** La fila representa el vencimiento, no el trabajo previsto. */
  plazo: boolean;
  esAdmin: boolean;
}) {
  return (
    <Link
      href={`/panel/ordenes/${orden.id}`}
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-tci-borde bg-white px-3 py-2.5 transition-colors hover:border-tci-gris"
    >
      <span className="font-mono text-xs text-tci-gris">{orden.numero}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-tci-negro">
        {orden.titulo}
      </span>
      {plazo && (
        <Insignia tono="border border-tci-rojo/40 bg-white text-tci-rojo">
          Vence
        </Insignia>
      )}
      <Insignia tono={COLOR_ESTADO[orden.estado]}>
        {ETIQUETA_ESTADO[orden.estado]}
      </Insignia>
      {esAdmin && (
        <span className="text-xs text-tci-gris">
          {orden.tecnico?.name ?? "Sin asignar"}
        </span>
      )}
    </Link>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Alerta } from "@/components/form";
import { Boton, EncabezadoPagina, Vacio } from "@/components/ui";
import { DIAS_SEMANA, celdasDelMes, claveDia } from "@/lib/calendario";
import { ApiError } from "@/lib/api";
import { ETIQUETA_ESTADO } from "@/lib/ordenes";
import {
  limitesDelMes,
  obtenerCalendario,
  type EventoCalendario,
} from "@/lib/preventivo";

/**
 * TCI-51 — calendario de mantenimientos preventivos.
 *
 * Rejilla de mes y no lista, porque la pregunta que se hace aqui es "que
 * semana viene cargada", y eso solo se ve con los dias en su sitio.
 *
 * Un dia puede tener mas eventos de los que caben en su celda. En vez de
 * encogerlos hasta lo ilegible, la celda muestra los dos primeros y cuantos
 * quedan, y al pulsarla se despliega el dia entero debajo. La rejilla conserva
 * la forma del mes; el detalle vive fuera de ella.
 */
export function CalendarioPreventivo() {
  const [mes, setMes] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    const { desde, hasta } = limitesDelMes(mes);
    obtenerCalendario(desde, hasta)
      .then((datos) => {
        if (cancelado) return;
        setEventos(datos.eventos);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setError(
            e instanceof ApiError
              ? e.message
              : "No se pudo cargar el calendario.",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [mes]);

  /** Los eventos agrupados por dia, en clave local `YYYY-MM-DD`. */
  const porDia = useMemo(() => {
    const mapa = new Map<string, EventoCalendario[]>();
    for (const evento of eventos) {
      const clave = claveDia(new Date(evento.fecha));
      const lista = mapa.get(clave) ?? [];
      lista.push(evento);
      mapa.set(clave, lista);
    }
    return mapa;
  }, [eventos]);

  const dias = useMemo(() => celdasDelMes(mes), [mes]);
  const hoy = claveDia(new Date());

  function cambiarMes(delta: number) {
    setCargando(true);
    setDiaAbierto(null);
    setMes(
      (actual) => new Date(actual.getFullYear(), actual.getMonth() + delta, 1),
    );
  }

  const abiertos = diaAbierto ? (porDia.get(diaAbierto) ?? []) : [];

  return (
    <section>
      <EncabezadoPagina
        titulo="Calendario de mantenimientos"
        descripcion="Lo que toca según los planes, con y sin orden generada."
        acciones={
          <>
            <Link
              href="/panel/preventivo"
              className="rounded-lg border border-tci-borde bg-white px-4 py-2 text-sm font-semibold text-tci-negro hover:bg-tci-humo"
            >
              Ver planes
            </Link>
            <Boton
              onClick={() => cambiarMes(-1)}
              aria-label="Mes anterior"
              variante="secundario"
            >
              ←
            </Boton>
            <p className="min-w-40 text-center text-sm font-semibold text-tci-negro">
              {mes.toLocaleDateString("es-HN", {
                month: "long",
                year: "numeric",
              })}
            </p>
            <Boton
              onClick={() => cambiarMes(1)}
              aria-label="Mes siguiente"
              variante="secundario"
            >
              →
            </Boton>
          </>
        }
      />

      <Leyenda />

      {error && (
        <div className="mt-4">
          <Alerta>{error}</Alerta>
        </div>
      )}

      {/* Escritorio: la rejilla del mes. En movil no cabe sin encoger los dias
          hasta que no se lee nada, asi que ahi va la lista (TCI-44). */}
      <div
        className={`mt-5 hidden md:block ${cargando ? "opacity-50" : ""}`}
        role="grid"
        aria-label="Mantenimientos del mes"
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
            const delDia = porDia.get(clave) ?? [];
            return (
              <Celda
                key={clave}
                dia={dia}
                clave={clave}
                eventos={delDia}
                esHoy={clave === hoy}
                abierto={diaAbierto === clave}
                onAbrir={() =>
                  setDiaAbierto((actual) => (actual === clave ? null : clave))
                }
              />
            );
          })}
        </div>
      </div>

      {diaAbierto && abiertos.length > 0 && (
        <div className="mt-4 hidden rounded-xl border border-tci-borde bg-white p-4 md:block">
          <h2 className="text-sm font-semibold text-tci-negro">
            {new Date(abiertos[0].fecha).toLocaleDateString("es-HN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h2>
          <ul className="mt-3 space-y-3">
            {abiertos.map((evento, i) => (
              <li
                key={`${evento.equipo.id}-${i}`}
                className="border-b border-tci-borde pb-3 last:border-0 last:pb-0"
              >
                <Detalle evento={evento} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Movil: la misma informacion en lista cronologica. */}
      <div className={`mt-5 md:hidden ${cargando ? "opacity-50" : ""}`}>
        {eventos.length === 0 && !cargando ? (
          <Vacio>No hay mantenimientos programados este mes.</Vacio>
        ) : (
          <ul className="space-y-3">
            {eventos.map((evento, i) => (
              <li
                key={`${evento.equipo.id}-${i}`}
                className="rounded-xl border border-tci-borde bg-white p-4"
              >
                <p className="text-xs font-semibold text-tci-gris uppercase">
                  {new Date(evento.fecha).toLocaleDateString("es-HN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </p>
                <div className="mt-1">
                  <Detalle evento={evento} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {eventos.length === 0 && !cargando && (
        <p className="mt-4 hidden text-sm text-tci-gris md:block">
          No hay mantenimientos programados este mes.
        </p>
      )}
    </section>
  );
}

/**
 * La leyenda va siempre, no solo cuando hay eventos: la diferencia entre una
 * orden y una proyeccion no se adivina del color, y aqui el color no es el
 * unico portador —cada entrada lleva ademas su etiqueta.
 */
function Leyenda() {
  return (
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-tci-gris">
      <span className="flex items-center gap-1.5">
        <Marca tipo="ORDEN" vencido={false} />
        Orden generada
      </span>
      <span className="flex items-center gap-1.5">
        <Marca tipo="PROYECCION" vencido={false} />
        Previsión según el plan
      </span>
      <span className="flex items-center gap-1.5">
        <Marca tipo="ORDEN" vencido />
        Vencido
      </span>
    </div>
  );
}

/**
 * El distintivo de un evento. La proyeccion va hueca y la orden maciza: es la
 * diferencia entre lo que puede pasar y lo que ya existe, y se distingue
 * tambien en blanco y negro.
 */
function Marca({ tipo, vencido }: { tipo: string; vencido: boolean }) {
  const color = vencido ? "border-tci-rojo bg-tci-rojo" : "border-tci-grafito";
  return (
    <span
      aria-hidden
      className={`h-2.5 w-2.5 shrink-0 rounded-full border-2 ${color} ${
        tipo === "ORDEN" && !vencido ? "bg-tci-grafito" : ""
      } ${tipo === "PROYECCION" && !vencido ? "bg-white" : ""}`}
    />
  );
}

function Celda({
  dia,
  clave,
  eventos,
  esHoy,
  abierto,
  onAbrir,
}: {
  dia: { fecha: Date; delMes: boolean };
  clave: string;
  eventos: EventoCalendario[];
  esHoy: boolean;
  abierto: boolean;
  onAbrir: () => void;
}) {
  const visibles = eventos.slice(0, 2);
  const restantes = eventos.length - visibles.length;

  return (
    <button
      type="button"
      onClick={onAbrir}
      disabled={eventos.length === 0}
      aria-label={`${clave}: ${eventos.length} mantenimiento(s)`}
      className={`min-h-24 bg-white p-2 text-left align-top transition-colors disabled:cursor-default ${
        dia.delMes ? "" : "bg-tci-humo/60"
      } ${abierto ? "ring-2 ring-tci-rojo ring-inset" : ""} ${
        eventos.length > 0 ? "hover:bg-tci-humo" : ""
      }`}
    >
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
          esHoy
            ? "bg-tci-rojo font-bold text-white"
            : dia.delMes
              ? "text-tci-grafito"
              : "text-tci-gris/60"
        }`}
      >
        {dia.fecha.getDate()}
      </span>

      <span className="mt-1 block space-y-1">
        {visibles.map((evento, i) => (
          <span
            key={`${evento.equipo.id}-${i}`}
            className="flex items-center gap-1 text-xs text-tci-grafito"
          >
            <Marca tipo={evento.tipo} vencido={evento.vencido} />
            <span className="truncate">{evento.equipo.codigo}</span>
          </span>
        ))}
        {restantes > 0 && (
          <span className="block text-xs text-tci-gris">+{restantes} más</span>
        )}
      </span>
    </button>
  );
}

function Detalle({ evento }: { evento: EventoCalendario }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-bold text-tci-negro">
          <Marca tipo={evento.tipo} vencido={evento.vencido} />
          {evento.equipo.nombre}
        </p>
        <p className="text-xs text-tci-gris">
          <span className="font-mono">{evento.equipo.codigo}</span> ·{" "}
          {evento.cliente.nombre} · {evento.plan.nombre}
        </p>
      </div>

      <div className="shrink-0 text-right">
        {evento.orden ? (
          <Link
            href={`/panel/ordenes/${evento.orden.id}`}
            className="text-sm font-bold text-tci-negro underline-offset-2 hover:text-tci-rojo hover:underline"
          >
            {evento.orden.numero}
          </Link>
        ) : (
          <span className="text-xs text-tci-gris">Sin orden todavía</span>
        )}
        <p className="text-xs text-tci-gris">
          {evento.orden
            ? ETIQUETA_ESTADO[evento.orden.estado]
            : "Previsión del plan"}
        </p>
      </div>
    </div>
  );
}

/** `YYYY-MM-DD` en hora local, que es como se agrupa por dia en la pantalla. */

/**
 * Las celdas del mes, completando la primera y la ultima semana con los dias
 * vecinos. La semana empieza en lunes, que es como se planifica el trabajo.
 */

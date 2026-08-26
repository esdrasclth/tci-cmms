"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Alerta, Campo } from "@/components/form";
import { BotonFila, BotonesDialogo, Modal } from "@/components/modal";
import { ApiError } from "@/lib/api";
import { listarClientesAdmin, type Cliente } from "@/lib/clientes";
import { ETIQUETA_PRIORIDAD, type Prioridad } from "@/lib/ordenes";
import {
  UNIDADES,
  actualizarPlan,
  crearPlan,
  crearTipoEquipo,
  describirFrecuencia,
  eliminarPlan,
  formatearFechaCorta,
  listarPlanes,
  listarTiposEquipoActivos,
  obtenerAlcanceDelPlan,
  type AlcanceDelPlan,
  type PlanListado,
  type TipoEquipoActivo,
  type UnidadFrecuencia,
} from "@/lib/preventivo";
import { listarTiposActivos, type TipoActivo } from "@/lib/tipos-mantenimiento";

type Dialogo =
  | { tipo: "nuevo" }
  | { tipo: "editar"; item: PlanListado }
  | { tipo: "borrar"; item: PlanListado }
  | { tipo: "alcance"; item: PlanListado }
  | { tipo: "nuevoTipoEquipo" }
  | null;

/**
 * TCI-49 — planes de mantenimiento preventivo.
 *
 * Un plan es abstracto hasta que se ve a quien alcanza, asi que cada fila dice
 * a cuantos equipos aplica y se puede abrir para ver cuales y cuando le toca a
 * cada uno. Eso es tambien lo que hace comprobable el plan antes de que exista
 * el generador (TCI-50).
 *
 * El vencimiento se cuenta desde el ultimo cierre real, no desde un calendario
 * fijo: si el preventivo de marzo se hizo el 10 de abril, el siguiente cuenta
 * desde el 10 de abril.
 */
export function GestionPreventivo() {
  const [planes, setPlanes] = useState<PlanListado[]>([]);
  const [tiposEquipo, setTiposEquipo] = useState<TipoEquipoActivo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [dialogo, setDialogo] = useState<Dialogo>(null);

  useEffect(() => {
    let cancelado = false;
    Promise.all([listarPlanes(), listarTiposEquipoActivos()])
      .then(([lista, tipos]) => {
        if (cancelado) return;
        setPlanes(lista);
        setTiposEquipo(tipos);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setError(
            e instanceof ApiError ? e.message : "No se pudieron cargar los planes.",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [intento]);

  const recargar = useCallback(() => {
    setCargando(true);
    setIntento((n) => n + 1);
  }, []);

  async function alternarActivo(plan: PlanListado) {
    try {
      await actualizarPlan(plan.id, { activo: !plan.activo });
      setError(null);
      recargar();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "No se pudo cambiar el estado.",
      );
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="tci-display text-2xl font-semibold text-tci-negro">
            Mantenimiento preventivo
          </h1>
          <p className="mt-1 text-sm text-tci-gris">
            Cada cuánto le toca mantenimiento a cada tipo de equipo.
          </p>
        </div>
        <button
          onClick={() => setDialogo({ tipo: "nuevo" })}
          disabled={tiposEquipo.length === 0}
          title={
            tiposEquipo.length === 0
              ? "Cree primero un tipo de equipo: el plan cuelga de él"
              : undefined
          }
          className="rounded-lg bg-tci-rojo px-4 py-2.5 text-sm font-semibold text-white hover:bg-tci-rojo-hover disabled:opacity-50"
        >
          Nuevo plan
        </button>
      </div>

      {/* Sin tipos de equipo no hay plan posible, asi que el camino para
          crearlos vive aqui y no escondido en la pantalla de equipos. */}
      {tiposEquipo.length === 0 && !cargando && (
        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">No hay tipos de equipo todavía.</p>
          <p className="mt-1">
            Un plan se define por tipo de equipo —&quot;todo compresor cada 3
            meses&quot;—, así que primero hay que tener al menos uno.{" "}
            <button
              onClick={() => setDialogo({ tipo: "nuevoTipoEquipo" })}
              className="font-semibold underline underline-offset-2"
            >
              Crear un tipo de equipo
            </button>
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4">
          <Alerta>{error}</Alerta>
        </div>
      )}

      <div className="mt-5">
        {cargando && planes.length === 0 ? (
          <Esqueleto />
        ) : planes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-tci-borde bg-white p-8 text-center text-sm text-tci-grafito">
            No hay planes de mantenimiento definidos.
          </p>
        ) : (
          <ul className={`space-y-3 ${cargando ? "opacity-50" : ""}`}>
            {planes.map((plan) => (
              <li
                key={plan.id}
                className="rounded-xl border border-tci-borde bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-tci-negro">
                      {plan.nombre}
                      {!plan.activo && (
                        <span className="ml-2 rounded-full bg-tci-humo px-2 py-0.5 text-xs font-normal text-tci-gris">
                          Desactivado
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-sm text-tci-grafito">
                      {plan.tipoEquipo.nombre} ·{" "}
                      {describirFrecuencia(
                        plan.frecuenciaValor,
                        plan.frecuenciaUnidad,
                      ).toLowerCase()}{" "}
                      · {plan.tipoMantenimiento.nombre}
                    </p>
                    <p className="mt-0.5 text-xs text-tci-gris">
                      {plan.cliente
                        ? `Solo ${plan.cliente.nombre}`
                        : "Todos los clientes"}
                      {" · "}
                      Aviso {plan.diasAnticipacion} días antes
                    </p>
                  </div>
                  <button
                    onClick={() => setDialogo({ tipo: "alcance", item: plan })}
                    className="shrink-0 rounded-lg border border-tci-borde px-3 py-1.5 text-sm font-semibold text-tci-negro hover:bg-tci-humo"
                  >
                    {plan.equipos} {plan.equipos === 1 ? "equipo" : "equipos"}
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <BotonFila
                    onClick={() => setDialogo({ tipo: "editar", item: plan })}
                  >
                    Editar
                  </BotonFila>
                  <BotonFila onClick={() => void alternarActivo(plan)}>
                    {plan.activo ? "Desactivar" : "Activar"}
                  </BotonFila>
                  <BotonFila
                    peligro
                    onClick={() => setDialogo({ tipo: "borrar", item: plan })}
                  >
                    Borrar
                  </BotonFila>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(dialogo?.tipo === "nuevo" || dialogo?.tipo === "editar") && (
        <DialogoPlan
          existente={dialogo.tipo === "editar" ? dialogo.item : undefined}
          tiposEquipo={tiposEquipo}
          onCerrar={() => setDialogo(null)}
          onGuardado={() => {
            setDialogo(null);
            recargar();
          }}
        />
      )}

      {dialogo?.tipo === "nuevoTipoEquipo" && (
        <DialogoTipoEquipo
          onCerrar={() => setDialogo(null)}
          onGuardado={() => {
            setDialogo(null);
            recargar();
          }}
        />
      )}

      {dialogo?.tipo === "alcance" && (
        <DialogoAlcance
          plan={dialogo.item}
          onCerrar={() => setDialogo(null)}
        />
      )}

      {dialogo?.tipo === "borrar" && (
        <DialogoBorrar
          plan={dialogo.item}
          onCerrar={() => setDialogo(null)}
          onBorrado={() => {
            setDialogo(null);
            recargar();
          }}
        />
      )}
    </section>
  );
}

function DialogoPlan({
  existente,
  tiposEquipo,
  onCerrar,
  onGuardado,
}: {
  existente?: PlanListado;
  tiposEquipo: TipoEquipoActivo[];
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tiposMantenimiento, setTiposMantenimiento] = useState<TipoActivo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  useEffect(() => {
    Promise.all([listarTiposActivos(), listarClientesAdmin({ activo: true })])
      .then(([tipos, lista]) => {
        setTiposMantenimiento(tipos);
        setClientes(lista);
      })
      .catch(() => setError("No se pudieron cargar los catálogos."));
  }, []);

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const d = new FormData(evento.currentTarget);
    const comunes = {
      nombre: String(d.get("nombre")).trim(),
      descripcion: String(d.get("descripcion") ?? "").trim(),
      tipoMantenimientoId: String(d.get("tipoMantenimientoId")),
      frecuenciaValor: Number(d.get("frecuenciaValor")),
      frecuenciaUnidad: String(d.get("frecuenciaUnidad")) as UnidadFrecuencia,
      diasAnticipacion: Number(d.get("diasAnticipacion") || 7),
      prioridad: String(d.get("prioridad")) as Prioridad,
      instrucciones: String(d.get("instrucciones") ?? "").trim(),
    };
    const clienteId = String(d.get("clienteId") ?? "");

    setGuardando(true);
    setError(null);
    try {
      if (existente) {
        await actualizarPlan(existente.id, {
          ...comunes,
          clienteId: clienteId || null,
        });
      } else {
        await crearPlan({
          ...comunes,
          tipoEquipoId: String(d.get("tipoEquipoId")),
          clienteId: clienteId || undefined,
        });
      }
      onGuardado();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar.");
      setGuardando(false);
    }
  }

  return (
    <Modal
      titulo={existente ? "Editar plan" : "Nuevo plan de mantenimiento"}
      onCerrar={onCerrar}
      bloqueado={guardando}
    >
      <form onSubmit={alEnviar} className="mt-5 space-y-4" noValidate>
        {error && <Alerta>{error}</Alerta>}

        <Campo
          etiqueta="Nombre del plan"
          name="nombre"
          defaultValue={existente?.nombre}
          placeholder="Preventivo trimestral de compresores"
          required
        />

        <div>
          <label
            htmlFor="tipoEquipoId"
            className="mb-1.5 block text-sm font-semibold text-tci-negro"
          >
            Tipo de equipo
          </label>
          <select
            id="tipoEquipoId"
            name="tipoEquipoId"
            defaultValue={existente?.tipoEquipo.id}
            // Al editar no se puede cambiar: seria convertirlo en otro plan y
            // dejar colgadas las ordenes que ya genero.
            disabled={existente !== undefined}
            required
            className="w-full rounded-lg border border-tci-borde bg-white px-4 py-2.5 text-sm text-tci-negro disabled:bg-tci-humo disabled:text-tci-gris"
          >
            {!existente && <option value="">Elija un tipo...</option>}
            {tiposEquipo.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nombre}
              </option>
            ))}
            {existente && (
              <option value={existente.tipoEquipo.id}>
                {existente.tipoEquipo.nombre}
              </option>
            )}
          </select>
          {existente && (
            <p className="mt-1 text-xs text-tci-gris">
              El tipo de equipo no se cambia: sería otro plan. Cree uno nuevo.
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Cada"
            name="frecuenciaValor"
            type="number"
            min="1"
            max="365"
            defaultValue={String(existente?.frecuenciaValor ?? 3)}
            required
          />
          <div>
            <label
              htmlFor="frecuenciaUnidad"
              className="mb-1.5 block text-sm font-semibold text-tci-negro"
            >
              Unidad
            </label>
            <select
              id="frecuenciaUnidad"
              name="frecuenciaUnidad"
              defaultValue={existente?.frecuenciaUnidad ?? "MESES"}
              className="w-full rounded-lg border border-tci-borde bg-white px-4 py-2.5 text-sm text-tci-negro"
            >
              {UNIDADES.map((u) => (
                <option key={u.valor} value={u.valor}>
                  {u.etiqueta}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="tipoMantenimientoId"
            className="mb-1.5 block text-sm font-semibold text-tci-negro"
          >
            Tipo de mantenimiento de las órdenes que genere
          </label>
          <select
            id="tipoMantenimientoId"
            name="tipoMantenimientoId"
            defaultValue={existente?.tipoMantenimiento.id}
            required
            className="w-full rounded-lg border border-tci-borde bg-white px-4 py-2.5 text-sm text-tci-negro"
          >
            <option value="">Elija un tipo...</option>
            {tiposMantenimiento.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="clienteId"
              className="mb-1.5 block text-sm font-semibold text-tci-negro"
            >
              Cliente
            </label>
            <select
              id="clienteId"
              name="clienteId"
              defaultValue={existente?.cliente?.id ?? ""}
              className="w-full rounded-lg border border-tci-borde bg-white px-4 py-2.5 text-sm text-tci-negro"
            >
              <option value="">Todos los clientes</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="prioridad"
              className="mb-1.5 block text-sm font-semibold text-tci-negro"
            >
              Prioridad de las órdenes
            </label>
            <select
              id="prioridad"
              name="prioridad"
              defaultValue={existente?.prioridad ?? "MEDIA"}
              className="w-full rounded-lg border border-tci-borde bg-white px-4 py-2.5 text-sm text-tci-negro"
            >
              {(["BAJA", "MEDIA", "ALTA", "URGENTE"] as Prioridad[]).map((p) => (
                <option key={p} value={p}>
                  {ETIQUETA_PRIORIDAD[p]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Campo
          etiqueta="Avisar con cuántos días de anticipación"
          name="diasAnticipacion"
          type="number"
          min="0"
          max="90"
          defaultValue={String(existente?.diasAnticipacion ?? 7)}
        />

        <Campo
          etiqueta="Instrucciones (opcional)"
          name="instrucciones"
          defaultValue={existente?.instrucciones ?? ""}
          placeholder="Cambio de filtros, revisión de correas, purga de condensados"
        />

        <p className="rounded-lg bg-tci-humo px-3 py-2 text-xs text-tci-gris">
          El próximo vencimiento se cuenta desde el último preventivo{" "}
          <strong>cerrado</strong> de este plan sobre cada equipo. Un equipo sin
          preventivo previo cuenta como vencido.
        </p>

        <BotonesDialogo
          onCerrar={onCerrar}
          guardando={guardando}
          texto={existente ? "Guardar cambios" : "Crear plan"}
        />
      </form>
    </Modal>
  );
}

function DialogoTipoEquipo({
  onCerrar,
  onGuardado,
}: {
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nombre = String(new FormData(evento.currentTarget).get("nombre")).trim();

    setGuardando(true);
    setError(null);
    try {
      await crearTipoEquipo(nombre);
      onGuardado();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar.");
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Nuevo tipo de equipo" onCerrar={onCerrar} bloqueado={guardando}>
      <form onSubmit={alEnviar} className="mt-5 space-y-4" noValidate>
        {error && <Alerta>{error}</Alerta>}
        <Campo
          etiqueta="Nombre"
          name="nombre"
          placeholder="Compresor"
          required
          minLength={2}
          maxLength={60}
        />
        <p className="rounded-lg bg-tci-humo px-3 py-2 text-xs text-tci-gris">
          Agrupa equipos que llevan el mismo mantenimiento. Se elige al dar de
          alta un equipo y es lo que engancha el plan.
        </p>
        <BotonesDialogo
          onCerrar={onCerrar}
          guardando={guardando}
          texto="Crear tipo"
        />
      </form>
    </Modal>
  );
}

/** A quien alcanza el plan y cuando le toca a cada uno. */
function DialogoAlcance({
  plan,
  onCerrar,
}: {
  plan: PlanListado;
  onCerrar: () => void;
}) {
  const [alcance, setAlcance] = useState<AlcanceDelPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    obtenerAlcanceDelPlan(plan.id)
      .then((datos) => {
        if (!cancelado) setAlcance(datos);
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setError(
            e instanceof ApiError ? e.message : "No se pudo cargar el alcance.",
          );
        }
      });
    return () => {
      cancelado = true;
    };
  }, [plan.id]);

  return (
    <Modal titulo={plan.nombre} onCerrar={onCerrar}>
      <p className="mt-1 text-sm text-tci-gris">
        {describirFrecuencia(plan.frecuenciaValor, plan.frecuenciaUnidad)} ·{" "}
        {plan.tipoEquipo.nombre}
      </p>

      <div className="mt-5">
        {error && <Alerta>{error}</Alerta>}
        {!alcance && !error && (
          <p className="text-sm text-tci-gris">Cargando...</p>
        )}

        {alcance?.equipos.length === 0 && (
          <p className="rounded-lg bg-tci-humo px-4 py-6 text-center text-sm text-tci-gris">
            Ningún equipo activo cae bajo este plan todavía.
          </p>
        )}

        {alcance && alcance.equipos.length > 0 && (
          <ul className="space-y-3">
            {alcance.equipos.map((equipo) => (
              <li
                key={equipo.id}
                className="border-b border-tci-borde pb-3 last:border-0"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-tci-negro">{equipo.nombre}</p>
                    <p className="text-xs text-tci-gris">
                      <span className="font-mono">{equipo.codigo}</span> ·{" "}
                      {equipo.cliente.nombre}
                    </p>
                  </div>
                  <Estado equipo={equipo} />
                </div>
                <p className="mt-1 text-xs text-tci-gris">
                  {equipo.ultimoPreventivo
                    ? `Último: ${equipo.ultimoPreventivo.numero} el ${formatearFechaCorta(equipo.ultimoPreventivo.fecha)}`
                    : "Nunca se le ha hecho el preventivo de este plan"}
                </p>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={onCerrar}
          className="mt-5 w-full rounded-lg border border-tci-borde px-4 py-3 text-sm font-bold text-tci-negro hover:bg-tci-humo"
        >
          Cerrar
        </button>
      </div>
    </Modal>
  );
}

function Estado({
  equipo,
}: {
  equipo: { vencido: boolean; porVencer: boolean; proximoVencimiento: string | null };
}) {
  if (equipo.vencido) {
    return (
      <span className="shrink-0 rounded-full bg-tci-rojo px-2.5 py-1 text-xs font-bold text-white">
        Vencido
      </span>
    );
  }
  if (equipo.porVencer) {
    return (
      <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
        Vence el {formatearFechaCorta(equipo.proximoVencimiento)}
      </span>
    );
  }
  return (
    <span className="shrink-0 text-xs text-tci-gris">
      Próximo: {formatearFechaCorta(equipo.proximoVencimiento)}
    </span>
  );
}

function DialogoBorrar({
  plan,
  onCerrar,
  onBorrado,
}: {
  plan: PlanListado;
  onCerrar: () => void;
  onBorrado: () => void;
}) {
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function borrar() {
    setBorrando(true);
    setError(null);
    try {
      await eliminarPlan(plan.id);
      onBorrado();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo borrar.");
      setBorrando(false);
    }
  }

  return (
    <Modal titulo="Borrar plan" onCerrar={onCerrar} bloqueado={borrando}>
      <div className="mt-4 space-y-4">
        {error && <Alerta>{error}</Alerta>}
        <p className="text-sm text-tci-grafito">
          Se borrará <strong>{plan.nombre}</strong>. Si ya generó órdenes, el
          backend lo rechazará: en ese caso desactívelo para que deje de generar
          sin perder el rastro.
        </p>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCerrar}
            disabled={borrando}
            className="flex-1 rounded-lg border border-tci-borde px-4 py-3 text-sm font-bold text-tci-negro hover:bg-tci-humo disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void borrar()}
            disabled={borrando}
            className="flex-1 rounded-lg bg-tci-rojo px-4 py-3 text-sm font-bold text-white hover:bg-tci-rojo-hover disabled:opacity-50"
          >
            {borrando ? "Borrando..." : "Borrar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Esqueleto() {
  return (
    <div className="space-y-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-xl border border-tci-borde bg-white"
        />
      ))}
    </div>
  );
}

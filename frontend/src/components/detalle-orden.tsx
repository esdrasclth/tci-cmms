"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { DialogoAccion, useDialogoAccion } from "@/components/dialogo-accion";
import { Boton, EncabezadoPagina, clasesBoton } from "@/components/ui";

import { EvidenciaOrden } from "@/components/evidencia-orden";
import { RepuestosOrden } from "@/components/repuestos-orden";
import { API, ApiError } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import {
  COLOR_ESTADO,
  COLOR_PRIORIDAD,
  CONFIG_ACCION,
  ETIQUETA_ESTADO,
  ETIQUETA_PRIORIDAD,
  type Accion,
  type AsientoHistorial,
  type OrdenDetalle,
  type Tecnico,
  comentarOrden,
  ejecutarAccion,
  formatearFecha,
  formatearFechaHora,
  formatearDinero,
  listarTecnicos,
  obtenerOrden,
} from "@/lib/ordenes";

/**
 * Detalle de una orden con sus transiciones y su hilo de comentarios (TCI-42).
 *
 * Los botones salen de `accionesDisponibles`, que calcula el backend segun el
 * estado y el rol: aqui no se decide que es valido, solo se pinta. Tras cada
 * accion se relee la orden entera, de modo que la vista refleja el estado real
 * y no una suposicion local.
 *
 * El canal SSE notifica los cambios producidos por otros usuarios. La vista no
 * confia en el payload del evento: vuelve a leer la orden para conservar sus
 * permisos y las acciones disponibles calculadas por el backend.
 */
export function DetalleOrden({ id }: { id: string }) {
  const { data: sesion } = useSession();
  const esAdmin = sesion?.user.rol === "ADMIN";

  const [orden, setOrden] = useState<OrdenDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [cargandoTecnicos, setCargandoTecnicos] = useState(false);
  const [conexionEnVivo, setConexionEnVivo] = useState(false);
  const dialogo = useDialogoAccion();

  useEffect(() => {
    let cancelado = false;
    obtenerOrden(id)
      .then((o) => {
        if (!cancelado) setOrden(o);
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setError(
            e instanceof ApiError ? e.message : "No se pudo cargar la orden.",
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

  const releer = useCallback(async () => {
    setOrden(await obtenerOrden(id));
  }, [id]);

  // El stream se abre una sola vez por orden, cuando ya se sabe que la carga
  // inicial funciono. Depender del objeto `orden` entero lo reabriria en cada
  // relectura, y como cada evento provoca una relectura, seria un bucle.
  const ordenCargada = orden !== null;

  useEffect(() => {
    if (!ordenCargada) return;

    const fuente = new EventSource(`${API}/api/ordenes/${id}/eventos`, {
      withCredentials: true,
    });
    const conectado = () => setConexionEnVivo(true);
    const actualizado = () => {
      void releer().catch(() => undefined);
    };
    const conError = () => setConexionEnVivo(false);

    fuente.addEventListener("conectado", conectado);
    fuente.addEventListener("orden-actualizada", actualizado);
    fuente.addEventListener("error", conError);

    return () => {
      fuente.close();
      setConexionEnVivo(false);
    };
  }, [id, ordenCargada, releer]);

  // Los tecnicos solo hacen falta al asignar, y solo un admin puede pedirlos.
  const abrirAccion = useCallback(
    (accion: Accion) => {
      dialogo.abrir(accion);
      if (
        CONFIG_ACCION[accion].pide === "tecnico" &&
        tecnicos.length === 0 &&
        !cargandoTecnicos
      ) {
        setCargandoTecnicos(true);
        listarTecnicos()
          .then(setTecnicos)
          .catch(() => setTecnicos([]))
          .finally(() => setCargandoTecnicos(false));
      }
    },
    [dialogo, tecnicos.length, cargandoTecnicos],
  );

  async function confirmar(cuerpo: Record<string, unknown>) {
    if (!dialogo.accion) return;
    dialogo.setEnviando(true);
    dialogo.setError(null);
    try {
      await ejecutarAccion(id, dialogo.accion, cuerpo);
      await releer();
      dialogo.cerrar();
    } catch (e) {
      dialogo.setError(
        e instanceof ApiError ? e.message : "No se pudo completar la accion.",
      );
    } finally {
      dialogo.setEnviando(false);
    }
  }

  if (cargando) {
    return <p className="text-sm text-tci-gris">Cargando orden...</p>;
  }

  if (error || !orden) {
    return (
      <div className="rounded-xl border border-dashed border-tci-borde bg-white p-8 text-center">
        <p className="text-tci-rojo">{error ?? "No se encontro la orden."}</p>
        <Link
          href="/panel"
          className="mt-3 inline-block text-sm font-bold text-tci-negro underline-offset-2 hover:text-tci-rojo hover:underline"
        >
          &larr; Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div>
      <EncabezadoPagina
        volver={{ href: "/panel", texto: "Volver al listado" }}
        encima={orden.numero}
        titulo={orden.titulo}
        descripcion={
          <>
            {orden.cliente.nombre}
            {orden.sede && ` · ${orden.sede.nombre}`}
          </>
        }
        acciones={
          <div className="flex flex-col items-end gap-2">
            <span
              className={`rounded-full px-3 py-1 text-sm font-bold ${COLOR_ESTADO[orden.estado]}`}
            >
              {ETIQUETA_ESTADO[orden.estado]}
            </span>
            <span className={`text-xs ${COLOR_PRIORIDAD[orden.prioridad]}`}>
              Prioridad {ETIQUETA_PRIORIDAD[orden.prioridad]}
            </span>
            <span
              className={`text-xs ${conexionEnVivo ? "text-emerald-700" : "text-tci-gris"}`}
              aria-live="polite"
            >
              {conexionEnVivo
                ? "Cambios en vivo"
                : "Reconectando cambios en vivo..."}
            </span>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {/* Editar es solo-admin y el backend lo rechaza en estado final. */}
        {esAdmin &&
          orden.estado !== "COMPLETADA" &&
          orden.estado !== "CANCELADA" && (
            <Link
              href={`/panel/ordenes/${orden.id}/editar`}
              className={clasesBoton({ variante: "secundario" })}
            >
              Editar datos
            </Link>
          )}
      </div>

      {orden.accionesDisponibles.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {orden.accionesDisponibles.map((accion) => {
            const config = CONFIG_ACCION[accion];
            return (
              <button
                key={accion}
                onClick={() => abrirAccion(accion)}
                className={`rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${
                  config.destacada
                    ? "bg-tci-rojo text-white hover:bg-tci-rojo-hover"
                    : config.destructiva
                      ? "border border-tci-rojo/40 text-tci-rojo hover:bg-tci-rojo/5"
                      : "border border-tci-borde bg-white text-tci-negro hover:bg-tci-humo"
                }`}
              >
                {config.etiqueta}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-5 rounded-lg bg-tci-humo px-4 py-3 text-sm text-tci-gris">
          No hay acciones disponibles para usted en este estado.
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Tarjeta titulo="Problema reportado">
            <p className="text-sm whitespace-pre-line text-tci-grafito">
              {orden.descripcionProblema}
            </p>
          </Tarjeta>

          {orden.trabajoRealizado && (
            <Tarjeta titulo="Trabajo realizado">
              <p className="text-sm whitespace-pre-line text-tci-grafito">
                {orden.trabajoRealizado}
              </p>
            </Tarjeta>
          )}

          {/* TCI-43. Una orden cerrada no admite cambios en su evidencia:
              el backend responde 422, asi que aqui ni se ofrece. */}
          <Tarjeta titulo="Evidencia">
            <EvidenciaOrden
              ordenId={id}
              adjuntos={orden.adjuntos}
              puedeEditar={
                orden.estado !== "COMPLETADA" && orden.estado !== "CANCELADA"
              }
              usuarioId={sesion?.user.id}
              esAdmin={esAdmin}
              onCambio={releer}
            />
          </Tarjeta>

          {/* TCI-46. Va antes del historial y despues de la evidencia porque es
              parte del parte de trabajo: lo que se hizo y lo que se gasto. */}
          <Tarjeta titulo="Repuestos usados">
            <RepuestosOrden
              ordenId={id}
              puedeEditar={
                orden.estado !== "COMPLETADA" && orden.estado !== "CANCELADA"
              }
              moneda={orden.moneda}
              onCambio={releer}
            />
          </Tarjeta>

          <Tarjeta titulo="Historial">
            <Historial asientos={orden.historial} />
            <CajaComentario
              onEnviar={async (texto) => {
                setOrden(await comentarOrden(id, texto));
              }}
            />
          </Tarjeta>
        </div>

        <aside className="space-y-6">
          <Tarjeta titulo="Datos">
            <dl className="space-y-3 text-sm">
              <Dato etiqueta="Tipo" valor={orden.tipoMantenimiento.nombre} />
              {/* Enlace a la ficha del equipo y su historial (TCI-38). */}
              <div className="flex justify-between gap-4">
                <dt className="text-tci-gris">Equipo</dt>
                <dd className="text-right font-bold text-tci-grafito">
                  {orden.equipo ? (
                    <Link
                      href={`/panel/equipos/${orden.equipo.id}`}
                      className="underline-offset-2 hover:text-tci-rojo hover:underline"
                    >
                      {orden.equipo.codigo} — {orden.equipo.nombre}
                    </Link>
                  ) : (
                    "Sin equipo"
                  )}
                </dd>
              </div>
              <Dato
                etiqueta="Tecnico"
                valor={orden.tecnico?.name ?? "Sin asignar"}
              />
              {esAdmin && (
                <Dato etiqueta="Creada por" valor={orden.creadoPor.name} />
              )}
              <Dato
                etiqueta="Programada"
                valor={formatearFecha(orden.fechaProgramada)}
              />
              <Dato
                etiqueta="Fecha limite"
                valor={formatearFecha(orden.fechaLimite)}
              />
            </dl>
          </Tarjeta>

          {(orden.fechaInicio ?? orden.fechaFin) && (
            <Tarjeta titulo="Ejecucion">
              <dl className="space-y-3 text-sm">
                <Dato
                  etiqueta="Inicio"
                  valor={
                    orden.fechaInicio
                      ? formatearFechaHora(orden.fechaInicio)
                      : "—"
                  }
                />
                <Dato
                  etiqueta="Fin"
                  valor={
                    orden.fechaFin ? formatearFechaHora(orden.fechaFin) : "—"
                  }
                />
                <Dato
                  etiqueta="Horas"
                  valor={
                    orden.horasTrabajadas ? String(orden.horasTrabajadas) : "—"
                  }
                />
                {esAdmin && (
                  <Dato
                    etiqueta="Costo total"
                    valor={formatearDinero(orden.costoTotal, orden.moneda)}
                  />
                )}
              </dl>
            </Tarjeta>
          )}
        </aside>
      </div>

      {dialogo.accion && (
        <DialogoAccion
          accion={dialogo.accion}
          tecnicos={tecnicos}
          cargandoTecnicos={cargandoTecnicos}
          enviando={dialogo.enviando}
          error={dialogo.error}
          onCerrar={dialogo.cerrar}
          onConfirmar={(cuerpo) => void confirmar(cuerpo)}
        />
      )}
    </div>
  );
}

function Tarjeta({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-tci-borde bg-white p-5">
      <h2 className="mb-3 text-sm font-bold text-tci-negro uppercase">
        {titulo}
      </h2>
      {children}
    </section>
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

function Historial({ asientos }: { asientos: AsientoHistorial[] }) {
  if (asientos.length === 0) {
    return <p className="text-sm text-tci-gris">Sin movimientos.</p>;
  }

  return (
    <ol className="space-y-4 border-l border-tci-borde pl-4">
      {asientos.map((asiento) => (
        <li key={asiento.id} className="relative">
          <span
            className="absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full bg-tci-borde"
            aria-hidden
          />
          <p className="text-sm text-tci-negro">{describir(asiento)}</p>
          {asiento.comentario && asiento.tipo !== "COMENTARIO" && (
            <p className="mt-0.5 text-sm text-tci-grafito italic">
              &laquo;{asiento.comentario}&raquo;
            </p>
          )}
          <p className="mt-0.5 text-xs text-tci-gris">
            {asiento.usuario.name} · {formatearFechaHora(asiento.createdAt)}
          </p>
        </li>
      ))}
    </ol>
  );
}

/** Convierte un asiento del historial en una frase legible. */
function describir(asiento: AsientoHistorial): string {
  switch (asiento.tipo) {
    case "COMENTARIO":
      return asiento.comentario ?? "";
    case "ASIGNACION":
      return asiento.valorNuevo
        ? "Asigno la orden a un tecnico"
        : "Quito la asignacion";
    case "EDICION":
      return `Cambio ${asiento.campo ?? "un dato"}`;
    case "ADJUNTO":
      return asiento.valorNuevo
        ? `Adjunto evidencia: ${asiento.valorNuevo}`
        : `Retiro la evidencia: ${asiento.valorAnterior ?? "un archivo"}`;
    case "CAMBIO_ESTADO":
      if (!asiento.estadoAnterior) return "Creo la orden";
      return `${ETIQUETA_ESTADO[asiento.estadoAnterior]} → ${
        asiento.estadoNuevo ? ETIQUETA_ESTADO[asiento.estadoNuevo] : "?"
      }`;
    default:
      return "Movimiento";
  }
}

function CajaComentario({
  onEnviar,
}: {
  onEnviar: (texto: string) => Promise<void>;
}) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const limpio = texto.trim();
    if (limpio.length < 2) return;

    setEnviando(true);
    setError(null);
    try {
      await onEnviar(limpio);
      setTexto("");
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "No se pudo guardar el comentario.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={alEnviar} className="mt-5 border-t border-tci-borde pt-4">
      <label htmlFor="comentario-nuevo" className="sr-only">
        Nuevo comentario
      </label>
      <textarea
        id="comentario-nuevo"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Escriba un comentario para el historial..."
        className="w-full rounded-lg border border-tci-borde px-4 py-3 text-sm text-tci-negro placeholder:text-tci-gris/70 hover:border-tci-gris/60 focus:border-tci-rojo focus:outline-none"
      />
      {error && <p className="mt-1 text-xs text-tci-rojo">{error}</p>}
      <div className="mt-2 flex justify-end">
        <Boton type="submit" disabled={enviando || texto.trim().length < 2}>
          {enviando ? "Guardando..." : "Comentar"}
        </Boton>
      </div>
    </form>
  );
}

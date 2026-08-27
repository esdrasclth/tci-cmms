"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Alerta, Campo } from "@/components/form";
import { IconoEditar } from "@/components/iconos";
import { EncabezadoPagina, clasesControl } from "@/components/ui";

import { BotonFila, BotonesDialogo, Modal } from "@/components/modal";
import { ApiError } from "@/lib/api";
import {
  ETIQUETA_CANAL,
  ETIQUETA_EVENTO,
  MARCADORES,
  cambiarPlantilla,
  cambiarPreferencia,
  listarPlantillas,
  listarPreferencias,
  type CanalNotificacion,
  type EventoNotificable,
  type Plantilla,
  type Preferencia,
} from "@/lib/notificaciones";

/** El orden del enum, que es el del flujo de la orden y no el alfabetico. */
const EVENTOS: EventoNotificable[] = [
  "ORDEN_ASIGNADA",
  "ORDEN_COMPLETADA",
  "ORDEN_CANCELADA",
  "ORDEN_REABIERTA",
  "ORDEN_COMENTADA",
  "PREVENTIVO_POR_VENCER",
  "REPUESTO_BAJO_MINIMO",
];

const CANALES: CanalNotificacion[] = ["EN_APP", "CORREO"];

/**
 * TCI-54, TCI-55 y TCI-56 — que se notifica, a quien, por donde y con que texto.
 *
 * La configuracion es **por rol y no por usuario**, a proposito: con el tamano
 * de equipo de TCI, preferencias individuales solo servirian para que alguien se
 * desactive los avisos y luego no se entere de su trabajo.
 *
 * Una fila por evento y rol, con una casilla por canal. Se ve de un vistazo
 * quien recibe que, que es la pregunta que se hace al abrir esto.
 */
export function GestionNotificaciones() {
  const [preferencias, setPreferencias] = useState<Preferencia[]>([]);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [editando, setEditando] = useState<Plantilla | null>(null);

  useEffect(() => {
    let cancelado = false;
    Promise.all([listarPreferencias(), listarPlantillas()])
      .then(([prefs, plants]) => {
        if (cancelado) return;
        setPreferencias(prefs);
        setPlantillas(plants);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setError(
            e instanceof ApiError
              ? e.message
              : "No se pudo cargar la configuracion.",
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

  const recargar = useCallback(() => setIntento((n) => n + 1), []);

  async function alternar(preferencia: Preferencia) {
    // Optimista: la casilla responde al instante y se corrige si el backend
    // dice que no. Esperar la respuesta en una rejilla de casillas se siente
    // roto.
    setPreferencias((actuales) =>
      actuales.map((p) =>
        p.id === preferencia.id ? { ...p, activo: !p.activo } : p,
      ),
    );
    try {
      await cambiarPreferencia(preferencia.id, !preferencia.activo);
      setError(null);
    } catch (e) {
      setPreferencias((actuales) =>
        actuales.map((p) =>
          p.id === preferencia.id ? { ...p, activo: preferencia.activo } : p,
        ),
      );
      setError(
        e instanceof ApiError
          ? e.message
          : "No se pudo cambiar la preferencia.",
      );
    }
  }

  const buscar = (
    evento: EventoNotificable,
    rol: "ADMIN" | "TECNICO",
    canal: CanalNotificacion,
  ) =>
    preferencias.find(
      (p) => p.evento === evento && p.rol === rol && p.canal === canal,
    );

  /** Los pares evento/rol que existen. Los que no, no se pintan. */
  const filas = EVENTOS.flatMap((evento) =>
    (["ADMIN", "TECNICO"] as const)
      .filter((rol) =>
        preferencias.some((p) => p.evento === evento && p.rol === rol),
      )
      .map((rol) => ({ evento, rol })),
  );

  const correoApagado = preferencias
    .filter((p) => p.canal === "CORREO")
    .every((p) => !p.activo);

  return (
    <section>
      <EncabezadoPagina
        titulo="Notificaciones"
        descripcion="Qué avisa el sistema, a quién y por dónde."
      />

      {correoApagado && (
        <div className="mt-4 rounded-xl border border-tci-borde bg-tci-humo px-4 py-3 text-sm text-tci-grafito">
          <p className="font-semibold text-tci-negro">
            El envío por correo está apagado
          </p>
          <p className="mt-1 text-tci-gris">
            Queda pendiente de que el cliente confirme el dominio de TCI, que es
            con el que hay que firmar los envíos. Puede encender las casillas de
            correo desde ya: no saldrá nada hasta que se configure, y entonces
            empezarán a salir sin tocar nada más.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4">
          <Alerta>{error}</Alerta>
        </div>
      )}

      {cargando ? (
        <Esqueleto />
      ) : (
        <>
          {/* Tabla en escritorio, tarjetas en movil (TCI-44). */}
          <div className="mt-5 hidden overflow-x-auto rounded-xl border border-tci-borde bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-tci-borde bg-tci-humo text-xs text-tci-gris uppercase">
                <tr>
                  <th className="px-4 py-3 font-bold">Evento</th>
                  <th className="px-4 py-3 font-bold">Rol</th>
                  {CANALES.map((canal) => (
                    <th key={canal} className="px-4 py-3 font-bold">
                      {ETIQUETA_CANAL[canal]}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-bold">Texto</th>
                </tr>
              </thead>
              <tbody>
                {filas.map(({ evento, rol }) => (
                  <tr
                    key={`${evento}-${rol}`}
                    className="border-b border-tci-borde last:border-0"
                  >
                    <td className="px-4 py-3 font-bold text-tci-negro">
                      {ETIQUETA_EVENTO[evento]}
                    </td>
                    <td className="px-4 py-3 text-tci-grafito">
                      {rol === "ADMIN" ? "Administrador" : "Técnico"}
                    </td>
                    {CANALES.map((canal) => {
                      const preferencia = buscar(evento, rol, canal);
                      return (
                        <td key={canal} className="px-4 py-3">
                          {preferencia ? (
                            <Casilla
                              preferencia={preferencia}
                              onAlternar={() => void alternar(preferencia)}
                            />
                          ) : (
                            <span className="text-tci-gris">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3">
                      <BotonPlantilla
                        plantillas={plantillas}
                        evento={evento}
                        onEditar={setEditando}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-5 space-y-3 md:hidden">
            {filas.map(({ evento, rol }) => (
              <li
                key={`${evento}-${rol}`}
                className="rounded-xl border border-tci-borde bg-white p-4"
              >
                <p className="font-bold text-tci-negro">
                  {ETIQUETA_EVENTO[evento]}
                </p>
                <p className="text-xs text-tci-gris">
                  {rol === "ADMIN" ? "Administrador" : "Técnico"}
                </p>
                <div className="mt-3 space-y-2">
                  {CANALES.map((canal) => {
                    const preferencia = buscar(evento, rol, canal);
                    if (!preferencia) return null;
                    return (
                      <Casilla
                        key={canal}
                        preferencia={preferencia}
                        onAlternar={() => void alternar(preferencia)}
                        conEtiqueta
                      />
                    );
                  })}
                </div>
                <div className="mt-3">
                  <BotonPlantilla
                    plantillas={plantillas}
                    evento={evento}
                    onEditar={setEditando}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {editando && (
        <DialogoPlantilla
          plantilla={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            recargar();
          }}
        />
      )}
    </section>
  );
}

function Casilla({
  preferencia,
  onAlternar,
  conEtiqueta = false,
}: {
  preferencia: Preferencia;
  onAlternar: () => void;
  conEtiqueta?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-tci-grafito">
      <input
        type="checkbox"
        checked={preferencia.activo}
        onChange={onAlternar}
        className="h-4 w-4 cursor-pointer rounded border-tci-borde accent-tci-rojo"
      />
      {conEtiqueta && ETIQUETA_CANAL[preferencia.canal]}
      <span className="sr-only">
        {ETIQUETA_CANAL[preferencia.canal]} para{" "}
        {ETIQUETA_EVENTO[preferencia.evento]}
      </span>
    </label>
  );
}

function BotonPlantilla({
  plantillas,
  evento,
  onEditar,
}: {
  plantillas: Plantilla[];
  evento: EventoNotificable;
  onEditar: (plantilla: Plantilla) => void;
}) {
  const plantilla = plantillas.find((p) => p.evento === evento);
  if (!plantilla) return <span className="text-tci-gris">—</span>;
  return (
    <BotonFila
      icono={IconoEditar}
      etiqueta="Editar texto"
      onClick={() => onEditar(plantilla)}
    />
  );
}

/**
 * TCI-56 — el texto de una notificacion.
 *
 * Se enseñan los marcadores disponibles porque no hay forma de adivinarlos, y
 * porque uno mal escrito no falla: sale tal cual en el aviso.
 */
function DialogoPlantilla({
  plantilla,
  onCerrar,
  onGuardado,
}: {
  plantilla: Plantilla;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const d = new FormData(evento.currentTarget);

    setGuardando(true);
    setError(null);
    try {
      await cambiarPlantilla(plantilla.id, {
        asunto: String(d.get("asunto")).trim(),
        cuerpo: String(d.get("cuerpo")).trim(),
      });
      onGuardado();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar.");
      setGuardando(false);
    }
  }

  return (
    <Modal
      titulo={ETIQUETA_EVENTO[plantilla.evento]}
      onCerrar={onCerrar}
      bloqueado={guardando}
    >
      <form onSubmit={alEnviar} className="mt-5 space-y-4" noValidate>
        {error && <Alerta>{error}</Alerta>}

        <Campo
          etiqueta="Asunto"
          name="asunto"
          defaultValue={plantilla.asunto}
          maxLength={200}
          required
        />

        <div>
          <label
            htmlFor="cuerpo"
            className="mb-1.5 block text-sm font-semibold text-tci-negro"
          >
            Mensaje
          </label>
          <textarea
            id="cuerpo"
            name="cuerpo"
            defaultValue={plantilla.cuerpo}
            rows={4}
            maxLength={2000}
            required
            className={clasesControl("w-full")}
          />
        </div>

        <div className="rounded-lg bg-tci-humo px-3 py-3 text-xs text-tci-gris">
          <p className="font-semibold text-tci-negro">
            Puede usar estos marcadores
          </p>
          <p className="mt-1.5 flex flex-wrap gap-1.5">
            {MARCADORES[plantilla.evento].map((marcador) => (
              <code
                key={marcador}
                className="rounded border border-tci-borde bg-white px-1.5 py-0.5 font-mono"
              >
                {`{{${marcador}}}`}
              </code>
            ))}
          </p>
          <p className="mt-2">
            Un marcador mal escrito no falla: sale tal cual en el aviso.
          </p>
        </div>

        <BotonesDialogo
          onCerrar={onCerrar}
          guardando={guardando}
          texto="Guardar texto"
        />
      </form>
    </Modal>
  );
}

function Esqueleto() {
  return (
    <div className="mt-5 space-y-3" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-xl border border-tci-borde bg-white"
        />
      ))}
    </div>
  );
}

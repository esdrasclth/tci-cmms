"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Alerta, Campo } from "@/components/form";
import { Boton, EncabezadoPagina, Vacio, clasesControl } from "@/components/ui";
import { IconoBorrar, IconoEditar } from "@/components/iconos";
import { BotonFila, BotonesDialogo, Modal } from "@/components/modal";
import { ApiError } from "@/lib/api";
import { useDebounce } from "@/lib/hooks";
import {
  COLORES_SUGERIDOS,
  actualizarTipo,
  crearTipo,
  eliminarTipo,
  listarTiposAdmin,
  type TipoMantenimiento,
} from "@/lib/tipos-mantenimiento";

type Dialogo =
  | { tipo: "nuevo" }
  | { tipo: "editar"; item: TipoMantenimiento }
  | { tipo: "borrar"; item: TipoMantenimiento }
  | null;

/**
 * TCI-30 — catálogo de tipos de mantenimiento.
 *
 * Misma distinción que en clientes y equipos, porque confundirla destruye
 * historial:
 *
 *  - **Desactivar** saca el tipo del formulario de alta de órdenes pero
 *    conserva las que ya lo usan.
 *  - **Borrar** solo se ofrece si ninguna orden lo usa. El backend lo rechaza
 *    en caso contrario, y aquí el botón sale deshabilitado con el motivo.
 */
export function GestionTipos() {
  const [tipos, setTipos] = useState<TipoMantenimiento[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroActivo, setFiltroActivo] = useState<"" | "true" | "false">("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [dialogo, setDialogo] = useState<Dialogo>(null);

  const busquedaDiferida = useDebounce(busqueda);

  useEffect(() => {
    let cancelado = false;
    listarTiposAdmin({
      q: busquedaDiferida,
      activo: filtroActivo === "" ? undefined : filtroActivo === "true",
    })
      .then((lista) => {
        if (cancelado) return;
        setTipos(lista);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setError(
            e instanceof ApiError
              ? e.message
              : "No se pudo cargar el catalogo.",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [intento, busquedaDiferida, filtroActivo]);

  const recargar = useCallback(() => {
    setCargando(true);
    setIntento((n) => n + 1);
  }, []);

  async function alternarActivo(tipo: TipoMantenimiento) {
    try {
      await actualizarTipo(tipo.id, { activo: !tipo.activo });
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
      <EncabezadoPagina
        titulo="Tipos de mantenimiento"
        descripcion="Clasificacion que se elige al levantar una orden de trabajo."
        acciones={
          <Boton onClick={() => setDialogo({ tipo: "nuevo" })}>
            Nuevo tipo
          </Boton>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="buscar-tipo" className="sr-only">
          Buscar tipo de mantenimiento
        </label>
        <input
          id="buscar-tipo"
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por codigo o nombre..."
          className={clasesControl("w-full max-w-sm")}
        />
        <label htmlFor="filtro-tipo-activo" className="sr-only">
          Filtrar por estado
        </label>
        <select
          id="filtro-tipo-activo"
          value={filtroActivo}
          onChange={(e) =>
            setFiltroActivo(e.target.value as "" | "true" | "false")
          }
          className={clasesControl()}
        >
          <option value="">Activos y desactivados</option>
          <option value="true">Solo activos</option>
          <option value="false">Solo desactivados</option>
        </select>
        {!cargando && (
          <p className="text-sm text-tci-gris">
            {tipos.length} {tipos.length === 1 ? "tipo" : "tipos"}
          </p>
        )}
      </div>

      {error && (
        <div className="mt-4">
          <Alerta>{error}</Alerta>
        </div>
      )}

      <div className="mt-5">
        {cargando && tipos.length === 0 ? (
          <Esqueleto />
        ) : tipos.length === 0 ? (
          <Vacio>
            {busqueda || filtroActivo
              ? "Ningun tipo coincide."
              : "No hay tipos de mantenimiento."}
          </Vacio>
        ) : (
          <div className={cargando ? "opacity-50" : ""}>
            {/* Tabla en escritorio, tarjetas en movil (TCI-44). */}
            <div className="hidden overflow-x-auto rounded-xl border border-tci-borde bg-white md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-tci-borde bg-tci-humo text-xs text-tci-gris uppercase">
                  <tr>
                    <th className="px-4 py-3 font-bold">Tipo</th>
                    <th className="px-4 py-3 font-bold">Exige equipo</th>
                    <th className="px-4 py-3 font-bold">Ordenes</th>
                    <th className="px-4 py-3 font-bold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tipos.map((tipo) => (
                    <tr
                      key={tipo.id}
                      className="border-b border-tci-borde last:border-0"
                    >
                      <td className="px-4 py-3">
                        <Etiqueta tipo={tipo} />
                      </td>
                      <td className="px-4 py-3 text-tci-grafito">
                        {tipo.requiereEquipo ? "Si" : "No"}
                      </td>
                      <td className="px-4 py-3 text-tci-grafito">
                        {tipo.ordenes}
                      </td>
                      <td className="w-px px-4 py-3">
                        <Acciones
                          tipo={tipo}
                          onEditar={() =>
                            setDialogo({ tipo: "editar", item: tipo })
                          }
                          onAlternar={() => void alternarActivo(tipo)}
                          onBorrar={() =>
                            setDialogo({ tipo: "borrar", item: tipo })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-3 md:hidden">
              {tipos.map((tipo) => (
                <li
                  key={tipo.id}
                  className="rounded-xl border border-tci-borde bg-white p-4"
                >
                  <Etiqueta tipo={tipo} />
                  <p className="mt-2 text-sm text-tci-gris">
                    {tipo.ordenes} {tipo.ordenes === 1 ? "orden" : "ordenes"}
                    {tipo.requiereEquipo && " · exige equipo"}
                  </p>
                  <div className="mt-3">
                    <Acciones
                      tipo={tipo}
                      onEditar={() =>
                        setDialogo({ tipo: "editar", item: tipo })
                      }
                      onAlternar={() => void alternarActivo(tipo)}
                      onBorrar={() =>
                        setDialogo({ tipo: "borrar", item: tipo })
                      }
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {dialogo?.tipo === "nuevo" && (
        <DialogoTipo
          onCerrar={() => setDialogo(null)}
          onGuardado={() => {
            setDialogo(null);
            recargar();
          }}
        />
      )}

      {dialogo?.tipo === "editar" && (
        <DialogoTipo
          existente={dialogo.item}
          onCerrar={() => setDialogo(null)}
          onGuardado={() => {
            setDialogo(null);
            recargar();
          }}
        />
      )}

      {dialogo?.tipo === "borrar" && (
        <DialogoBorrar
          tipo={dialogo.item}
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

/** Código con su color, nombre y aviso de desactivado. */
function Etiqueta({ tipo }: { tipo: TipoMantenimiento }) {
  return (
    <div className="flex items-start gap-2">
      <span
        aria-hidden
        className="mt-1 h-3 w-3 shrink-0 rounded-full border border-black/10"
        style={{ backgroundColor: tipo.color ?? "#e0e0e0" }}
      />
      <div>
        <p className="font-bold text-tci-negro">
          {tipo.nombre}
          {!tipo.activo && (
            <span className="ml-2 rounded-full bg-tci-humo px-2 py-0.5 text-xs font-normal text-tci-gris">
              Desactivado
            </span>
          )}
        </p>
        <p className="text-xs text-tci-gris">{tipo.codigo}</p>
      </div>
    </div>
  );
}

function Acciones({
  tipo,
  onEditar,
  onAlternar,
  onBorrar,
}: {
  tipo: TipoMantenimiento;
  onEditar: () => void;
  onAlternar: () => void;
  onBorrar: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 md:flex-nowrap">
      <BotonFila icono={IconoEditar} etiqueta="Editar" onClick={onEditar} />
      <BotonFila
        etiqueta={tipo.activo ? "Desactivar" : "Activar"}
        onClick={onAlternar}
      />
      <BotonFila
        icono={IconoBorrar}
        etiqueta="Borrar"
        peligro
        onClick={onBorrar}
        disabled={tipo.ordenes > 0}
        titulo={
          tipo.ordenes > 0
            ? "Se usa en ordenes ya registradas: desactivelo en lugar de borrarlo"
            : undefined
        }
      />
    </div>
  );
}

function DialogoTipo({
  existente,
  onCerrar,
  onGuardado,
}: {
  existente?: TipoMantenimiento;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [color, setColor] = useState(existente?.color ?? COLORES_SUGERIDOS[0]);

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const d = new FormData(evento.currentTarget);
    const datos = {
      codigo: String(d.get("codigo")).trim().toUpperCase(),
      nombre: String(d.get("nombre")).trim(),
      color,
      requiereEquipo: d.get("requiereEquipo") === "on",
    };

    setGuardando(true);
    setError(null);
    try {
      if (existente) await actualizarTipo(existente.id, datos);
      else await crearTipo(datos);
      onGuardado();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar.");
      setGuardando(false);
    }
  }

  return (
    <Modal
      titulo={existente ? "Editar tipo" : "Nuevo tipo de mantenimiento"}
      onCerrar={onCerrar}
      bloqueado={guardando}
    >
      <form onSubmit={alEnviar} className="mt-5 space-y-4" noValidate>
        {error && <Alerta>{error}</Alerta>}

        <Campo
          etiqueta="Codigo"
          name="codigo"
          defaultValue={existente?.codigo}
          placeholder="PREV"
          maxLength={12}
          required
          // Es la etiqueta corta de la tabla de ordenes: sin espacios ni tildes.
          pattern="[A-Za-z0-9\-]{2,12}"
          title="Entre 2 y 12 caracteres: letras, numeros y guion."
        />

        <Campo
          etiqueta="Nombre"
          name="nombre"
          defaultValue={existente?.nombre}
          placeholder="Mantenimiento preventivo"
          required
        />

        <fieldset>
          <legend className="text-sm font-bold text-tci-negro">Color</legend>
          <p className="mt-1 text-xs text-tci-gris">
            Distingue el tipo en el listado de ordenes.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {COLORES_SUGERIDOS.map((valor) => (
              <button
                key={valor}
                type="button"
                onClick={() => setColor(valor)}
                aria-label={`Color ${valor}`}
                aria-pressed={color === valor}
                style={{ backgroundColor: valor }}
                className={`h-9 w-9 rounded-full border-2 transition-transform ${
                  color === valor
                    ? "scale-110 border-tci-negro"
                    : "border-transparent"
                }`}
              />
            ))}
          </div>
        </fieldset>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-tci-humo p-3">
          <input
            type="checkbox"
            name="requiereEquipo"
            defaultChecked={existente?.requiereEquipo}
            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-tci-borde accent-tci-rojo"
          />
          <span className="text-sm text-tci-grafito">
            <span className="font-bold text-tci-negro">Exige equipo</span>
            <span className="mt-0.5 block text-xs text-tci-gris">
              Una orden de este tipo no se podra crear sin indicar sobre que
              equipo se trabaja.
            </span>
          </span>
        </label>

        <BotonesDialogo
          onCerrar={onCerrar}
          guardando={guardando}
          texto={existente ? "Guardar cambios" : "Crear tipo"}
        />
      </form>
    </Modal>
  );
}

function DialogoBorrar({
  tipo,
  onCerrar,
  onBorrado,
}: {
  tipo: TipoMantenimiento;
  onCerrar: () => void;
  onBorrado: () => void;
}) {
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setBorrando(true);
    setError(null);
    try {
      await eliminarTipo(tipo.id);
      onBorrado();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo borrar.");
      setBorrando(false);
    }
  }

  return (
    <Modal titulo="Borrar tipo" onCerrar={onCerrar} bloqueado={borrando}>
      <form onSubmit={alEnviar} className="mt-5 space-y-4">
        {error && <Alerta>{error}</Alerta>}
        <p className="text-sm text-tci-grafito">
          Se borrara <strong className="text-tci-negro">{tipo.nombre}</strong>{" "}
          del catalogo. Ninguna orden lo usa, asi que no se pierde historial.
        </p>
        <BotonesDialogo
          onCerrar={onCerrar}
          guardando={borrando}
          texto="Borrar"
        />
      </form>
    </Modal>
  );
}

function Esqueleto() {
  return (
    <div className="space-y-2" aria-busy>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl border border-tci-borde bg-white"
        />
      ))}
    </div>
  );
}

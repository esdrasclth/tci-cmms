"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Alerta, Campo } from "@/components/form";
import { BotonFila, BotonesDialogo, Modal } from "@/components/modal";
import { ApiError } from "@/lib/api";
import { useDebounce } from "@/lib/hooks";
import { listarClientesAdmin, type Cliente } from "@/lib/clientes";
import {
  actualizarEquipo,
  crearEquipo,
  eliminarEquipo,
  listarEquiposAdmin,
  type Equipo,
} from "@/lib/equipos";

type Dialogo =
  | { tipo: "nuevo" }
  | { tipo: "editar"; equipo: Equipo }
  | { tipo: "borrar"; equipo: Equipo }
  | null;

/**
 * TCI-37 — equipos y activos por cliente.
 *
 * Misma distincion que en clientes: desactivar saca al equipo de los
 * formularios pero conserva su historial de ordenes; borrar solo se ofrece si
 * nunca tuvo ninguna.
 */
export function GestionEquipos() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroSede, setFiltroSede] = useState("");
  const [filtroActivo, setFiltroActivo] = useState<"" | "true" | "false">("");
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [dialogo, setDialogo] = useState<Dialogo>(null);

  useEffect(() => {
    let cancelado = false;
    listarClientesAdmin()
      .then((lista) => {
        if (!cancelado) setClientes(lista);
      })
      .catch(() => {
        if (!cancelado) setClientes([]);
      });
    return () => {
      cancelado = true;
    };
  }, [intento]);

  // Sin diferir, cada tecla dispararia una peticion (TCI-39).
  const busquedaDiferida = useDebounce(busqueda);

  useEffect(() => {
    let cancelado = false;
    listarEquiposAdmin({
      clienteId: filtroCliente || undefined,
      sedeId: filtroSede || undefined,
      activo: filtroActivo === "" ? undefined : filtroActivo === "true",
      q: busquedaDiferida,
    })
      .then((lista) => {
        if (cancelado) return;
        setEquipos(lista);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setError(
            e instanceof ApiError ? e.message : "No se pudo cargar la lista.",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [intento, filtroCliente, filtroSede, filtroActivo, busquedaDiferida]);

  const recargar = useCallback(() => {
    setCargando(true);
    setIntento((n) => n + 1);
  }, []);

  async function alternarActivo(equipo: Equipo) {
    try {
      await actualizarEquipo(equipo.id, { activo: !equipo.activo });
      setError(null);
      recargar();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "No se pudo cambiar el estado.",
      );
    }
  }

  const clientesActivos = clientes.filter((c) => c.activo);
  const sedesDelFiltro =
    clientes.find((c) => c.id === filtroCliente)?.sedes ?? [];

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-tci-negro">Equipos</h1>
          <p className="mt-1 text-sm text-tci-gris">
            Activos de cada cliente sobre los que se abren ordenes.
          </p>
        </div>
        <button
          onClick={() => setDialogo({ tipo: "nuevo" })}
          disabled={clientesActivos.length === 0}
          title={
            clientesActivos.length === 0
              ? "Registre primero un cliente activo"
              : undefined
          }
          className="rounded-lg bg-tci-rojo px-4 py-2.5 text-sm font-bold text-white hover:bg-tci-rojo-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Nuevo equipo
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label htmlFor="filtro-cliente" className="sr-only">
          Filtrar por cliente
        </label>
        <select
          id="filtro-cliente"
          value={filtroCliente}
          onChange={(e) => {
            setFiltroCliente(e.target.value);
            // La sede elegida es de otro cliente: deja de tener sentido.
            setFiltroSede("");
          }}
          className="rounded-lg border border-tci-borde bg-white px-4 py-2.5 text-sm text-tci-negro"
        >
          <option value="">Todos los clientes</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>

        <label htmlFor="filtro-sede" className="sr-only">
          Filtrar por sede
        </label>
        <select
          id="filtro-sede"
          value={filtroSede}
          onChange={(e) => setFiltroSede(e.target.value)}
          disabled={!filtroCliente || sedesDelFiltro.length === 0}
          className="rounded-lg border border-tci-borde bg-white px-4 py-2.5 text-sm text-tci-negro disabled:bg-tci-humo disabled:text-tci-gris"
        >
          <option value="">
            {!filtroCliente
              ? "Todas las sedes"
              : sedesDelFiltro.length === 0
                ? "Sin sedes"
                : "Todas las sedes"}
          </option>
          {sedesDelFiltro.map((sede) => (
            <option key={sede.id} value={sede.id}>
              {sede.nombre}
            </option>
          ))}
        </select>

        <label htmlFor="filtro-activo" className="sr-only">
          Filtrar por estado
        </label>
        <select
          id="filtro-activo"
          value={filtroActivo}
          onChange={(e) =>
            setFiltroActivo(e.target.value as "" | "true" | "false")
          }
          className="rounded-lg border border-tci-borde bg-white px-4 py-2.5 text-sm text-tci-negro"
        >
          <option value="">Activos y desactivados</option>
          <option value="true">Solo activos</option>
          <option value="false">Solo desactivados</option>
        </select>

        <label htmlFor="buscar-equipo" className="sr-only">
          Buscar equipo
        </label>
        <input
          id="buscar-equipo"
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Codigo, nombre, marca, modelo o serie..."
          className="w-full max-w-xs rounded-lg border border-tci-borde px-4 py-2.5 text-sm text-tci-negro placeholder:text-tci-gris/70 focus:border-tci-rojo focus:outline-none"
        />

        {!cargando && (
          <p className="text-sm text-tci-gris">
            {equipos.length} {equipos.length === 1 ? "equipo" : "equipos"}
          </p>
        )}
      </div>

      {error && (
        <div className="mt-4">
          <Alerta>{error}</Alerta>
        </div>
      )}

      <div className="mt-5">
        {cargando && equipos.length === 0 ? (
          <div className="space-y-2" aria-busy>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl border border-tci-borde bg-white"
              />
            ))}
          </div>
        ) : equipos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-tci-borde bg-white p-8 text-center text-sm text-tci-grafito">
            {busqueda || filtroCliente || filtroSede || filtroActivo
              ? "Ningun equipo coincide."
              : "No hay equipos registrados."}
          </p>
        ) : (
          <div className={cargando ? "opacity-50" : ""}>
            {/* Tabla en escritorio, tarjetas en movil (TCI-44). */}
            <div className="hidden overflow-x-auto rounded-xl border border-tci-borde bg-white md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-tci-borde bg-tci-humo text-xs text-tci-gris uppercase">
                  <tr>
                    <th className="px-4 py-3 font-bold">Codigo</th>
                    <th className="px-4 py-3 font-bold">Equipo</th>
                    <th className="px-4 py-3 font-bold">Cliente</th>
                    <th className="px-4 py-3 font-bold">Ordenes</th>
                    <th className="px-4 py-3 font-bold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {equipos.map((equipo) => (
                    <tr
                      key={equipo.id}
                      className="border-b border-tci-borde last:border-0"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <CodigoEquipo equipo={equipo} />
                      </td>
                      <td className="px-4 py-3">
                        <Identidad equipo={equipo} />
                      </td>
                      <td className="px-4 py-3 text-tci-grafito">
                        <Ubicacion equipo={equipo} />
                      </td>
                      <td className="px-4 py-3 text-tci-grafito">
                        {equipo._count.ordenes}
                      </td>
                      <td className="px-4 py-3">
                        <Acciones
                          equipo={equipo}
                          setDialogo={setDialogo}
                          onAlternar={() => void alternarActivo(equipo)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-3 md:hidden">
              {equipos.map((equipo) => (
                <li
                  key={equipo.id}
                  className="rounded-xl border border-tci-borde bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Identidad equipo={equipo} />
                    <CodigoEquipo equipo={equipo} />
                  </div>
                  <p className="mt-2 text-sm text-tci-grafito">
                    <Ubicacion equipo={equipo} />
                  </p>
                  <p className="mt-2 text-sm text-tci-gris">
                    {equipo._count.ordenes}{" "}
                    {equipo._count.ordenes === 1 ? "orden" : "ordenes"}
                  </p>
                  <div className="mt-3">
                    <Acciones
                      equipo={equipo}
                      setDialogo={setDialogo}
                      onAlternar={() => void alternarActivo(equipo)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {dialogo?.tipo === "nuevo" && (
        <DialogoEquipo
          titulo="Nuevo equipo"
          clientes={clientesActivos}
          onCerrar={() => setDialogo(null)}
          onGuardado={() => {
            setDialogo(null);
            recargar();
          }}
        />
      )}
      {dialogo?.tipo === "editar" && (
        <DialogoEquipo
          titulo="Editar equipo"
          equipo={dialogo.equipo}
          clientes={clientes}
          onCerrar={() => setDialogo(null)}
          onGuardado={() => {
            setDialogo(null);
            recargar();
          }}
        />
      )}
      {dialogo?.tipo === "borrar" && (
        <DialogoBorrar
          equipo={dialogo.equipo}
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

/**
 * Piezas de una fila de equipo, compartidas por la tabla de escritorio y las
 * tarjetas de movil (TCI-44).
 */
function CodigoEquipo({ equipo }: { equipo: Equipo }) {
  return (
    <Link
      href={`/panel/equipos/${equipo.id}`}
      className="shrink-0 font-mono text-xs text-tci-gris underline-offset-2 hover:text-tci-rojo hover:underline"
    >
      {equipo.codigo}
    </Link>
  );
}

function Identidad({ equipo }: { equipo: Equipo }) {
  return (
    <div className="min-w-0">
      <p className="font-bold text-tci-negro">
        {equipo.nombre}
        {!equipo.activo && (
          <span className="ml-2 rounded-full bg-tci-humo px-2 py-0.5 text-xs font-normal text-tci-gris">
            Desactivado
          </span>
        )}
      </p>
      <p className="text-xs text-tci-gris">
        {[equipo.marca, equipo.modelo].filter(Boolean).join(" ") ||
          equipo.tipo ||
          "Sin detalle"}
      </p>
    </div>
  );
}

function Ubicacion({ equipo }: { equipo: Equipo }) {
  return (
    <>
      {equipo.cliente.nombre}
      {equipo.sede && (
        <span className="block text-xs text-tci-gris">{equipo.sede.nombre}</span>
      )}
    </>
  );
}

function Acciones({
  equipo,
  setDialogo,
  onAlternar,
}: {
  equipo: Equipo;
  setDialogo: (dialogo: Dialogo) => void;
  onAlternar: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <BotonFila onClick={() => setDialogo({ tipo: "editar", equipo })}>
        Editar
      </BotonFila>
      <BotonFila onClick={onAlternar}>
        {equipo.activo ? "Desactivar" : "Activar"}
      </BotonFila>
      <BotonFila
        peligro
        onClick={() => setDialogo({ tipo: "borrar", equipo })}
        disabled={equipo._count.ordenes > 0}
        titulo={
          equipo._count.ordenes > 0
            ? "Tiene ordenes en su historial: desactivelo en lugar de borrarlo"
            : undefined
        }
      >
        Borrar
      </BotonFila>
    </div>
  );
}

function DialogoEquipo({
  titulo,
  equipo,
  clientes,
  onCerrar,
  onGuardado,
}: {
  titulo: string;
  equipo?: Equipo;
  clientes: Cliente[];
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [clienteId, setClienteId] = useState(equipo?.cliente.id ?? "");
  const [sedeId, setSedeId] = useState(equipo?.sede?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const sedes =
    clientes.find((c) => c.id === clienteId)?.sedes.filter((s) => s.activo) ?? [];

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const d = new FormData(evento.currentTarget);
    const texto = (k: string) => String(d.get(k) ?? "").trim();

    const comunes = {
      codigo: texto("codigo"),
      nombre: texto("nombre"),
      ...(equipo || sedeId ? { sedeId } : {}),
      ...(equipo || texto("tipo") ? { tipo: texto("tipo") } : {}),
      ...(equipo || texto("marca") ? { marca: texto("marca") } : {}),
      ...(equipo || texto("modelo") ? { modelo: texto("modelo") } : {}),
      ...(equipo || texto("numeroSerie")
        ? { numeroSerie: texto("numeroSerie") }
        : {}),
      ...(equipo || texto("ubicacionFisica")
        ? { ubicacionFisica: texto("ubicacionFisica") }
        : {}),
    };

    setGuardando(true);
    setError(null);
    try {
      if (equipo) await actualizarEquipo(equipo.id, comunes);
      else await crearEquipo({ ...comunes, clienteId });
      onGuardado();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "No se pudo guardar el equipo.",
      );
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={titulo} onCerrar={onCerrar} bloqueado={guardando}>
      <form onSubmit={alEnviar} className="mt-5 space-y-4" noValidate>
        {error && <Alerta>{error}</Alerta>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Codigo"
            name="codigo"
            defaultValue={equipo?.codigo}
            placeholder="EQ-0001"
            required
          />
          <Campo
            etiqueta="Tipo (opcional)"
            name="tipo"
            defaultValue={equipo?.tipo ?? ""}
            placeholder="Compresor"
          />
        </div>

        <Campo
          etiqueta="Nombre"
          name="nombre"
          defaultValue={equipo?.nombre}
          placeholder="Compresor de tornillo 50HP"
          required
        />

        <div>
          <label
            htmlFor="clienteId"
            className="mb-1.5 block text-sm font-bold text-tci-negro"
          >
            Cliente
          </label>
          <select
            id="clienteId"
            value={clienteId}
            onChange={(e) => {
              setClienteId(e.target.value);
              setSedeId("");
            }}
            // El equipo pertenece a quien lo tiene: cambiarlo de cliente
            // desligaria su historial de ordenes.
            disabled={equipo !== undefined}
            required
            className="w-full rounded-lg border border-tci-borde bg-white px-4 py-3 text-sm text-tci-negro disabled:bg-tci-humo disabled:text-tci-gris"
          >
            <option value="">Elija un cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          {equipo && (
            <p className="mt-1 text-xs text-tci-gris">
              El cliente no se puede cambiar.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="sedeId"
            className="mb-1.5 block text-sm font-bold text-tci-negro"
          >
            Sede (opcional)
          </label>
          <select
            id="sedeId"
            value={sedeId}
            onChange={(e) => setSedeId(e.target.value)}
            disabled={!clienteId || sedes.length === 0}
            className="w-full rounded-lg border border-tci-borde bg-white px-4 py-3 text-sm text-tci-negro disabled:bg-tci-humo disabled:text-tci-gris"
          >
            <option value="">
              {!clienteId
                ? "Elija primero un cliente"
                : sedes.length === 0
                  ? "El cliente no tiene sedes"
                  : "Sin sede"}
            </option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.ciudad ? `${s.nombre} (${s.ciudad})` : s.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Marca (opcional)"
            name="marca"
            defaultValue={equipo?.marca ?? ""}
            placeholder="Atlas Copco"
          />
          <Campo
            etiqueta="Modelo (opcional)"
            name="modelo"
            defaultValue={equipo?.modelo ?? ""}
            placeholder="GA-37"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Numero de serie (opcional)"
            name="numeroSerie"
            defaultValue={equipo?.numeroSerie ?? ""}
            placeholder="AC37-99120"
          />
          <Campo
            etiqueta="Ubicacion fisica (opcional)"
            name="ubicacionFisica"
            defaultValue={equipo?.ubicacionFisica ?? ""}
            placeholder="Cuarto de maquinas"
          />
        </div>

        <BotonesDialogo
          onCerrar={onCerrar}
          guardando={guardando}
          texto={equipo ? "Guardar cambios" : "Crear equipo"}
        />
      </form>
    </Modal>
  );
}

function DialogoBorrar({
  equipo,
  onCerrar,
  onBorrado,
}: {
  equipo: Equipo;
  onCerrar: () => void;
  onBorrado: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [borrando, setBorrando] = useState(false);

  async function borrar() {
    setBorrando(true);
    setError(null);
    try {
      await eliminarEquipo(equipo.id);
      onBorrado();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo borrar.");
      setBorrando(false);
    }
  }

  return (
    <Modal titulo="Borrar equipo" onCerrar={onCerrar} bloqueado={borrando}>
      <div className="mt-5 space-y-4">
        {error && <Alerta>{error}</Alerta>}
        <p className="text-sm text-tci-grafito">
          Se borrara <strong>{equipo.codigo} — {equipo.nombre}</strong>. Esta
          accion no se deshace desde la interfaz.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCerrar}
            disabled={borrando}
            className="flex-1 rounded-lg border border-tci-borde px-4 py-3 text-sm font-bold text-tci-negro hover:bg-tci-humo disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
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

"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Alerta, Campo } from "@/components/form";
import { BotonFila, BotonesDialogo, Modal } from "@/components/modal";
import { ApiError } from "@/lib/api";
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

  useEffect(() => {
    let cancelado = false;
    listarEquiposAdmin({ clienteId: filtroCliente || undefined, q: busqueda })
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
  }, [intento, filtroCliente, busqueda]);

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

      <div className="mt-4 flex flex-wrap gap-3">
        <div>
          <label htmlFor="filtro-cliente" className="sr-only">
            Filtrar por cliente
          </label>
          <select
            id="filtro-cliente"
            value={filtroCliente}
            onChange={(e) => {
              setCargando(true);
              setFiltroCliente(e.target.value);
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
        </div>
        <div className="flex-1">
          <label htmlFor="buscar-equipo" className="sr-only">
            Buscar equipo
          </label>
          <input
            id="buscar-equipo"
            type="search"
            value={busqueda}
            onChange={(e) => {
              setCargando(true);
              setBusqueda(e.target.value);
            }}
            placeholder="Codigo, nombre, marca, modelo o serie..."
            className="w-full max-w-sm rounded-lg border border-tci-borde px-4 py-2.5 text-sm text-tci-negro placeholder:text-tci-gris/70 focus:border-tci-rojo focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <Alerta>{error}</Alerta>
        </div>
      )}

      <div className="mt-5">
        {cargando ? (
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
            {busqueda || filtroCliente
              ? "Ningun equipo coincide."
              : "No hay equipos registrados."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-tci-borde bg-white">
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
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-tci-gris">
                      {equipo.codigo}
                    </td>
                    <td className="px-4 py-3">
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
                    </td>
                    <td className="px-4 py-3 text-tci-grafito">
                      {equipo.cliente.nombre}
                      {equipo.sede && (
                        <span className="block text-xs text-tci-gris">
                          {equipo.sede.nombre}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-tci-grafito">
                      {equipo._count.ordenes}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <BotonFila
                          onClick={() => setDialogo({ tipo: "editar", equipo })}
                        >
                          Editar
                        </BotonFila>
                        <BotonFila onClick={() => void alternarActivo(equipo)}>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

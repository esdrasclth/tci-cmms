"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Alerta, Campo } from "@/components/form";
import { BotonFila, BotonesDialogo, Modal } from "@/components/modal";
import { ApiError } from "@/lib/api";
import { useDebounce } from "@/lib/hooks";
import {
  actualizarCliente,
  actualizarSede,
  crearCliente,
  crearSede,
  eliminarCliente,
  eliminarSede,
  listarClientesAdmin,
  type Cliente,
  type Sede,
} from "@/lib/clientes";

type Dialogo =
  | { tipo: "nuevo" }
  | { tipo: "editar"; cliente: Cliente }
  | { tipo: "sedes"; cliente: Cliente }
  | { tipo: "borrar"; cliente: Cliente }
  | null;

/**
 * TCI-36 — clientes y sus sedes.
 *
 * Se distinguen dos cosas que suelen confundirse:
 *
 *  - **Desactivar** saca al cliente de los formularios de alta de ordenes pero
 *    conserva todo su historial. Es lo normal cuando se deja de trabajar con el.
 *  - **Borrar** solo se ofrece si nunca tuvo ordenes. El backend lo rechaza en
 *    caso contrario, y aqui el boton sale deshabilitado con el motivo.
 */
export function GestionClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroActivo, setFiltroActivo] = useState<"" | "true" | "false">("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [dialogo, setDialogo] = useState<Dialogo>(null);

  // Sin diferir, cada tecla dispararia una peticion (TCI-39).
  const busquedaDiferida = useDebounce(busqueda);

  useEffect(() => {
    let cancelado = false;
    listarClientesAdmin({
      q: busquedaDiferida,
      activo: filtroActivo === "" ? undefined : filtroActivo === "true",
    })
      .then((lista) => {
        if (cancelado) return;
        setClientes(lista);
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
  }, [intento, busquedaDiferida, filtroActivo]);

  const recargar = useCallback(() => {
    setCargando(true);
    setIntento((n) => n + 1);
  }, []);

  async function alternarActivo(cliente: Cliente) {
    try {
      await actualizarCliente(cliente.id, { activo: !cliente.activo });
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-tci-negro">Clientes</h1>
          <p className="mt-1 text-sm text-tci-gris">
            Empresas atendidas y sus sedes.
          </p>
        </div>
        <button
          onClick={() => setDialogo({ tipo: "nuevo" })}
          className="rounded-lg bg-tci-rojo px-4 py-2.5 text-sm font-bold text-white hover:bg-tci-rojo-hover"
        >
          Nuevo cliente
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label htmlFor="buscar-cliente" className="sr-only">
          Buscar cliente
        </label>
        <input
          id="buscar-cliente"
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, RTN o contacto..."
          className="w-full max-w-sm rounded-lg border border-tci-borde px-4 py-2.5 text-sm text-tci-negro placeholder:text-tci-gris/70 focus:border-tci-rojo focus:outline-none"
        />
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
        {!cargando && (
          <p className="text-sm text-tci-gris">
            {clientes.length} {clientes.length === 1 ? "cliente" : "clientes"}
          </p>
        )}
      </div>

      {error && (
        <div className="mt-4">
          <Alerta>{error}</Alerta>
        </div>
      )}

      <div className="mt-5">
        {cargando && clientes.length === 0 ? (
          <Esqueleto />
        ) : clientes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-tci-borde bg-white p-8 text-center text-sm text-tci-grafito">
            {busqueda || filtroActivo
              ? "Ningun cliente coincide."
              : "No hay clientes."}
          </p>
        ) : (
          <div className={cargando ? "opacity-50" : ""}>
            {/* Tabla en escritorio, tarjetas en movil (TCI-44): con scroll
                horizontal habia que arrastrar la fila para llegar a los
                botones, que es justo lo que no funciona en campo. */}
            <div className="hidden overflow-x-auto rounded-xl border border-tci-borde bg-white md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-tci-borde bg-tci-humo text-xs text-tci-gris uppercase">
                  <tr>
                    <th className="px-4 py-3 font-bold">Cliente</th>
                    <th className="px-4 py-3 font-bold">Contacto</th>
                    <th className="px-4 py-3 font-bold">Sedes</th>
                    <th className="px-4 py-3 font-bold">Ordenes</th>
                    <th className="px-4 py-3 font-bold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((cliente) => (
                    <tr
                      key={cliente.id}
                      className="border-b border-tci-borde last:border-0"
                    >
                      <td className="px-4 py-3">
                        <Identidad cliente={cliente} />
                      </td>
                      <td className="px-4 py-3 text-tci-grafito">
                        <Contacto cliente={cliente} />
                      </td>
                      <td className="px-4 py-3 text-tci-grafito">
                        {cliente.sedes.length}
                      </td>
                      <td className="px-4 py-3 text-tci-grafito">
                        {cliente._count.ordenes}
                      </td>
                      <td className="px-4 py-3">
                        <Acciones
                          cliente={cliente}
                          setDialogo={setDialogo}
                          onAlternar={() => void alternarActivo(cliente)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-3 md:hidden">
              {clientes.map((cliente) => (
                <li
                  key={cliente.id}
                  className="rounded-xl border border-tci-borde bg-white p-4"
                >
                  <Identidad cliente={cliente} />
                  <div className="mt-2 text-sm text-tci-grafito">
                    <Contacto cliente={cliente} />
                  </div>
                  <p className="mt-2 text-sm text-tci-gris">
                    {cliente.sedes.length}{" "}
                    {cliente.sedes.length === 1 ? "sede" : "sedes"} ·{" "}
                    {cliente._count.ordenes}{" "}
                    {cliente._count.ordenes === 1 ? "orden" : "ordenes"}
                  </p>
                  <div className="mt-3">
                    <Acciones
                      cliente={cliente}
                      setDialogo={setDialogo}
                      onAlternar={() => void alternarActivo(cliente)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {dialogo?.tipo === "nuevo" && (
        <DialogoCliente
          titulo="Nuevo cliente"
          onCerrar={() => setDialogo(null)}
          onGuardado={() => {
            setDialogo(null);
            recargar();
          }}
        />
      )}
      {dialogo?.tipo === "editar" && (
        <DialogoCliente
          titulo="Editar cliente"
          cliente={dialogo.cliente}
          onCerrar={() => setDialogo(null)}
          onGuardado={() => {
            setDialogo(null);
            recargar();
          }}
        />
      )}
      {dialogo?.tipo === "sedes" && (
        <DialogoSedes
          cliente={dialogo.cliente}
          onCerrar={() => {
            setDialogo(null);
            recargar();
          }}
        />
      )}
      {dialogo?.tipo === "borrar" && (
        <DialogoBorrar
          cliente={dialogo.cliente}
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
 * Piezas de una fila de cliente, compartidas por la tabla de escritorio y las
 * tarjetas de movil (TCI-44), para que las dos vistas no se desincronicen.
 */
function Identidad({ cliente }: { cliente: Cliente }) {
  return (
    <div className="min-w-0">
      <p className="font-bold text-tci-negro">
        {cliente.nombre}
        {!cliente.activo && (
          <span className="ml-2 rounded-full bg-tci-humo px-2 py-0.5 text-xs font-normal text-tci-gris">
            Desactivado
          </span>
        )}
      </p>
      {cliente.rtn && (
        <p className="text-xs text-tci-gris">RTN {cliente.rtn}</p>
      )}
    </div>
  );
}

function Contacto({ cliente }: { cliente: Cliente }) {
  if (!cliente.contacto && !cliente.telefono) {
    return <span className="text-tci-gris">—</span>;
  }
  return (
    <>
      {cliente.contacto}
      {cliente.telefono && (
        <span className="block text-xs text-tci-gris">{cliente.telefono}</span>
      )}
    </>
  );
}

function Acciones({
  cliente,
  setDialogo,
  onAlternar,
}: {
  cliente: Cliente;
  setDialogo: (dialogo: Dialogo) => void;
  onAlternar: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <BotonFila onClick={() => setDialogo({ tipo: "editar", cliente })}>
        Editar
      </BotonFila>
      <BotonFila onClick={() => setDialogo({ tipo: "sedes", cliente })}>
        Sedes ({cliente.sedes.length})
      </BotonFila>
      <BotonFila onClick={onAlternar}>
        {cliente.activo ? "Desactivar" : "Activar"}
      </BotonFila>
      <BotonFila
        peligro
        onClick={() => setDialogo({ tipo: "borrar", cliente })}
        disabled={cliente._count.ordenes > 0}
        titulo={
          cliente._count.ordenes > 0
            ? "Tiene ordenes registradas: desactivelo en lugar de borrarlo"
            : undefined
        }
      >
        Borrar
      </BotonFila>
    </div>
  );
}

function DialogoCliente({
  titulo,
  cliente,
  onCerrar,
  onGuardado,
}: {
  titulo: string;
  cliente?: Cliente;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const d = new FormData(evento.currentTarget);
    const texto = (k: string) => String(d.get(k) ?? "").trim();

    const datos = {
      nombre: texto("nombre"),
      // Se manda siempre en la edicion para poder vaciarlos.
      ...(cliente || texto("rtn") ? { rtn: texto("rtn") } : {}),
      ...(cliente || texto("contacto") ? { contacto: texto("contacto") } : {}),
      ...(cliente || texto("telefono") ? { telefono: texto("telefono") } : {}),
      ...(cliente || texto("email") ? { email: texto("email") } : {}),
    };

    setGuardando(true);
    setError(null);
    try {
      if (cliente) await actualizarCliente(cliente.id, datos);
      else await crearCliente(datos);
      onGuardado();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "No se pudo guardar el cliente.",
      );
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={titulo} onCerrar={onCerrar} bloqueado={guardando}>
      <form onSubmit={alEnviar} className="mt-5 space-y-4" noValidate>
        {error && <Alerta>{error}</Alerta>}
        <Campo
          etiqueta="Nombre o razon social"
          name="nombre"
          defaultValue={cliente?.nombre}
          placeholder="Lacteos del Norte S.A."
          required
        />
        <Campo
          etiqueta="RTN (opcional)"
          name="rtn"
          defaultValue={cliente?.rtn ?? ""}
          placeholder="05019012345678"
          inputMode="numeric"
        />
        <Campo
          etiqueta="Persona de contacto (opcional)"
          name="contacto"
          defaultValue={cliente?.contacto ?? ""}
          placeholder="Maria Portillo"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Telefono (opcional)"
            name="telefono"
            type="tel"
            defaultValue={cliente?.telefono ?? ""}
            placeholder="+504 2550-1122"
          />
          <Campo
            etiqueta="Correo (opcional)"
            name="email"
            type="email"
            defaultValue={cliente?.email ?? ""}
            placeholder="mantenimiento@cliente.hn"
          />
        </div>
        <BotonesDialogo
          onCerrar={onCerrar}
          guardando={guardando}
          texto={cliente ? "Guardar cambios" : "Crear cliente"}
        />
      </form>
    </Modal>
  );
}

function DialogoSedes({
  cliente,
  onCerrar,
}: {
  cliente: Cliente;
  onCerrar: () => void;
}) {
  const [sedes, setSedes] = useState<Sede[]>(cliente.sedes);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState<Sede | null>(null);

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const d = new FormData(formulario);
    const texto = (k: string) => String(d.get(k) ?? "").trim();
    const datos = {
      nombre: texto("nombre"),
      direccion: texto("direccion"),
      ciudad: texto("ciudad"),
    };

    setGuardando(true);
    setError(null);
    try {
      if (editando) {
        const actualizada = await actualizarSede(editando.id, datos);
        setSedes((lista) =>
          lista.map((s) => (s.id === actualizada.id ? actualizada : s)),
        );
        setEditando(null);
      } else {
        const nueva = await crearSede(cliente.id, datos);
        setSedes((lista) => [...lista, nueva]);
      }
      formulario.reset();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo guardar la sede.");
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(sede: Sede) {
    setError(null);
    try {
      await eliminarSede(sede.id);
      setSedes((lista) => lista.filter((s) => s.id !== sede.id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo borrar la sede.");
    }
  }

  return (
    <Modal titulo={`Sedes de ${cliente.nombre}`} onCerrar={onCerrar}>
      <div className="mt-5 space-y-4">
        {error && <Alerta>{error}</Alerta>}

        {sedes.length === 0 ? (
          <p className="rounded-lg bg-tci-humo px-4 py-3 text-sm text-tci-gris">
            Este cliente no tiene sedes. Una orden puede crearse sin sede, pero
            registrarlas ayuda a ubicar los equipos.
          </p>
        ) : (
          <ul className="divide-y divide-tci-borde rounded-lg border border-tci-borde">
            {sedes.map((sede) => (
              <li
                key={sede.id}
                className="flex items-start justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-bold text-tci-negro">
                    {sede.nombre}
                  </p>
                  <p className="text-xs text-tci-gris">
                    {[sede.direccion, sede.ciudad].filter(Boolean).join(" · ") ||
                      "Sin direccion"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <BotonFila onClick={() => setEditando(sede)}>Editar</BotonFila>
                  <BotonFila peligro onClick={() => void borrar(sede)}>
                    Borrar
                  </BotonFila>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={alEnviar}
          className="space-y-3 border-t border-tci-borde pt-4"
          noValidate
          key={editando?.id ?? "nueva"}
        >
          <p className="text-sm font-bold text-tci-negro">
            {editando ? `Editar ${editando.nombre}` : "Agregar sede"}
          </p>
          <Campo
            etiqueta="Nombre"
            name="nombre"
            defaultValue={editando?.nombre ?? ""}
            placeholder="Planta San Pedro Sula"
            required
          />
          <Campo
            etiqueta="Direccion (opcional)"
            name="direccion"
            defaultValue={editando?.direccion ?? ""}
            placeholder="Zona Industrial, Bulevar del Norte"
          />
          <Campo
            etiqueta="Ciudad (opcional)"
            name="ciudad"
            defaultValue={editando?.ciudad ?? ""}
            placeholder="San Pedro Sula"
          />
          <div className="flex gap-3">
            {editando && (
              <button
                type="button"
                onClick={() => setEditando(null)}
                className="flex-1 rounded-lg border border-tci-borde px-4 py-2.5 text-sm font-bold text-tci-negro hover:bg-tci-humo"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 rounded-lg bg-tci-rojo px-4 py-2.5 text-sm font-bold text-white hover:bg-tci-rojo-hover disabled:opacity-50"
            >
              {guardando ? "Guardando..." : editando ? "Guardar" : "Agregar"}
            </button>
          </div>
        </form>

        <button
          onClick={onCerrar}
          className="w-full rounded-lg border border-tci-borde px-4 py-3 text-sm font-bold text-tci-negro hover:bg-tci-humo"
        >
          Cerrar
        </button>
      </div>
    </Modal>
  );
}

function DialogoBorrar({
  cliente,
  onCerrar,
  onBorrado,
}: {
  cliente: Cliente;
  onCerrar: () => void;
  onBorrado: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [borrando, setBorrando] = useState(false);

  async function borrar() {
    setBorrando(true);
    setError(null);
    try {
      await eliminarCliente(cliente.id);
      onBorrado();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo borrar.");
      setBorrando(false);
    }
  }

  return (
    <Modal titulo="Borrar cliente" onCerrar={onCerrar} bloqueado={borrando}>
      <div className="mt-5 space-y-4">
        {error && <Alerta>{error}</Alerta>}
        <p className="text-sm text-tci-grafito">
          Se borrara <strong>{cliente.nombre}</strong> y sus{" "}
          {cliente.sedes.length} sede(s). Esta accion no se deshace desde la
          interfaz.
        </p>
        {cliente._count.equipos > 0 && (
          <p className="rounded-lg bg-tci-humo px-4 py-3 text-xs text-tci-gris">
            Tiene {cliente._count.equipos} equipo(s) registrados, que quedaran
            sin cliente visible. Si solo quiere dejar de trabajar con el,
            desactivelo en lugar de borrarlo.
          </p>
        )}
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

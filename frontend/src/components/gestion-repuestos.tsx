"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Alerta, Campo } from "@/components/form";
import { BotonFila, BotonesDialogo, Modal } from "@/components/modal";
import { ApiError } from "@/lib/api";
import { useDebounce } from "@/lib/hooks";
import {
  actualizarRepuesto,
  crearRepuesto,
  eliminarRepuesto,
  formatearCantidad,
  formatearMoneda,
  listarMovimientos,
  listarRepuestosAdmin,
  registrarEntrada,
  registrarSalida,
  type MovimientoInventario,
  type Repuesto,
} from "@/lib/repuestos";

type Dialogo =
  | { tipo: "nuevo" }
  | { tipo: "editar"; item: Repuesto }
  | { tipo: "borrar"; item: Repuesto }
  | { tipo: "entrada"; item: Repuesto }
  | { tipo: "salida"; item: Repuesto }
  | { tipo: "libro"; item: Repuesto }
  | null;

/**
 * TCI-45 — catalogo de repuestos, con los avisos de minimos de TCI-47.
 *
 * La existencia no se edita: se mueve con entradas y salidas, que dejan asiento
 * en el libro. Por eso el dialogo de edicion no tiene campo de stock y en su
 * lugar hay dos acciones por fila. El backend rechaza el campo igualmente, pero
 * la pantalla no debe ofrecer lo que no se puede hacer.
 */
export function GestionRepuestos() {
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroActivo, setFiltroActivo] = useState<"" | "true" | "false">("");
  const [soloBajoMinimo, setSoloBajoMinimo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [dialogo, setDialogo] = useState<Dialogo>(null);

  const busquedaDiferida = useDebounce(busqueda);

  useEffect(() => {
    let cancelado = false;
    listarRepuestosAdmin({
      q: busquedaDiferida,
      activo: filtroActivo === "" ? undefined : filtroActivo === "true",
      bajoMinimo: soloBajoMinimo,
    })
      .then((lista) => {
        if (cancelado) return;
        setRepuestos(lista);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setError(
            e instanceof ApiError ? e.message : "No se pudo cargar el catalogo.",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [intento, busquedaDiferida, filtroActivo, soloBajoMinimo]);

  const recargar = useCallback(() => {
    setCargando(true);
    setIntento((n) => n + 1);
  }, []);

  async function alternarActivo(repuesto: Repuesto) {
    try {
      await actualizarRepuesto(repuesto.id, { activo: !repuesto.activo });
      setError(null);
      recargar();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "No se pudo cambiar el estado.",
      );
    }
  }

  // El aviso se cuenta sobre lo que hay en pantalla, no sobre el catalogo
  // entero: si el usuario esta filtrando, un numero mayor confundiria.
  const enAviso = repuestos.filter((r) => r.bajoMinimo).length;

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="tci-display text-2xl font-semibold text-tci-negro">
            Repuestos
          </h1>
          <p className="mt-1 text-sm text-tci-gris">
            Existencias de almacén y su consumo en las órdenes.
          </p>
        </div>
        <button
          onClick={() => setDialogo({ tipo: "nuevo" })}
          className="rounded-lg bg-tci-rojo px-4 py-2.5 text-sm font-semibold text-white hover:bg-tci-rojo-hover"
        >
          Nuevo repuesto
        </button>
      </div>

      {/* TCI-47. El aviso vive aqui, donde se puede actuar sobre el, y no en
          una pantalla aparte que habria que acordarse de visitar. */}
      {enAviso > 0 && !soloBajoMinimo && (
        <button
          onClick={() => setSoloBajoMinimo(true)}
          className="mt-4 flex w-full items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900 transition-colors hover:bg-amber-100"
        >
          <span className="font-semibold">
            {enAviso} {enAviso === 1 ? "repuesto llegó" : "repuestos llegaron"}{" "}
            al mínimo
          </span>
          <span className="text-amber-800">Ver solo esos</span>
        </button>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label htmlFor="buscar-repuesto" className="sr-only">
          Buscar repuesto
        </label>
        <input
          id="buscar-repuesto"
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por código o nombre..."
          className="w-full max-w-sm rounded-lg border border-tci-borde px-4 py-2.5 text-sm text-tci-negro placeholder:text-tci-gris/70 focus:border-tci-rojo focus:outline-none"
        />
        <label htmlFor="filtro-repuesto-activo" className="sr-only">
          Filtrar por estado
        </label>
        <select
          id="filtro-repuesto-activo"
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
        {soloBajoMinimo && (
          <button
            onClick={() => setSoloBajoMinimo(false)}
            className="rounded-full border border-tci-rojo bg-tci-rojo px-3 py-1.5 text-xs font-semibold text-white"
          >
            Solo bajo mínimo ✕
          </button>
        )}
        {!cargando && (
          <p className="text-sm text-tci-gris">
            {repuestos.length}{" "}
            {repuestos.length === 1 ? "repuesto" : "repuestos"}
          </p>
        )}
      </div>

      {error && (
        <div className="mt-4">
          <Alerta>{error}</Alerta>
        </div>
      )}

      <div className="mt-5">
        {cargando && repuestos.length === 0 ? (
          <Esqueleto />
        ) : repuestos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-tci-borde bg-white p-8 text-center text-sm text-tci-grafito">
            {busqueda || filtroActivo || soloBajoMinimo
              ? "Ningún repuesto coincide."
              : "No hay repuestos en el catálogo."}
          </p>
        ) : (
          <div className={cargando ? "opacity-50" : ""}>
            {/* Tabla en escritorio, tarjetas en movil (TCI-44). */}
            <div className="hidden overflow-x-auto rounded-xl border border-tci-borde bg-white md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-tci-borde bg-tci-humo text-xs text-tci-gris uppercase">
                  <tr>
                    <th className="px-4 py-3 font-bold">Repuesto</th>
                    <th className="px-4 py-3 font-bold">Existencia</th>
                    <th className="px-4 py-3 font-bold">Costo</th>
                    <th className="px-4 py-3 font-bold">Órdenes</th>
                    <th className="px-4 py-3 font-bold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {repuestos.map((repuesto) => (
                    <tr
                      key={repuesto.id}
                      className="border-b border-tci-borde last:border-0"
                    >
                      <td className="px-4 py-3">
                        <Identidad repuesto={repuesto} />
                      </td>
                      <td className="px-4 py-3">
                        <Existencia repuesto={repuesto} />
                      </td>
                      <td className="px-4 py-3 text-tci-grafito">
                        {formatearMoneda(
                          repuesto.costoUnitario,
                          repuesto.moneda,
                        )}
                      </td>
                      <td className="px-4 py-3 text-tci-grafito">
                        {repuesto.ordenes}
                      </td>
                      <td className="px-4 py-3">
                        <Acciones
                          repuesto={repuesto}
                          setDialogo={setDialogo}
                          onAlternar={() => void alternarActivo(repuesto)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-3 md:hidden">
              {repuestos.map((repuesto) => (
                <li
                  key={repuesto.id}
                  className="rounded-xl border border-tci-borde bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Identidad repuesto={repuesto} />
                    <Existencia repuesto={repuesto} />
                  </div>
                  <p className="mt-2 text-sm text-tci-gris">
                    {formatearMoneda(repuesto.costoUnitario, repuesto.moneda)} ·{" "}
                    {repuesto.ordenes}{" "}
                    {repuesto.ordenes === 1 ? "orden" : "órdenes"}
                  </p>
                  <div className="mt-3">
                    <Acciones
                      repuesto={repuesto}
                      setDialogo={setDialogo}
                      onAlternar={() => void alternarActivo(repuesto)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {(dialogo?.tipo === "nuevo" || dialogo?.tipo === "editar") && (
        <DialogoRepuesto
          existente={dialogo.tipo === "editar" ? dialogo.item : undefined}
          onCerrar={() => setDialogo(null)}
          onGuardado={() => {
            setDialogo(null);
            recargar();
          }}
        />
      )}

      {(dialogo?.tipo === "entrada" || dialogo?.tipo === "salida") && (
        <DialogoMovimiento
          repuesto={dialogo.item}
          sentido={dialogo.tipo}
          onCerrar={() => setDialogo(null)}
          onGuardado={() => {
            setDialogo(null);
            recargar();
          }}
        />
      )}

      {dialogo?.tipo === "libro" && (
        <DialogoLibro
          repuesto={dialogo.item}
          onCerrar={() => setDialogo(null)}
        />
      )}

      {dialogo?.tipo === "borrar" && (
        <DialogoBorrar
          repuesto={dialogo.item}
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
 * Piezas de una fila, compartidas por la tabla de escritorio y las tarjetas de
 * movil (TCI-44), para que las dos vistas no se desincronicen.
 */
function Identidad({ repuesto }: { repuesto: Repuesto }) {
  return (
    <div className="min-w-0">
      <p className="font-bold text-tci-negro">
        {repuesto.nombre}
        {!repuesto.activo && (
          <span className="ml-2 rounded-full bg-tci-humo px-2 py-0.5 text-xs font-normal text-tci-gris">
            Desactivado
          </span>
        )}
      </p>
      <p className="text-xs text-tci-gris">{repuesto.codigo}</p>
    </div>
  );
}

function Existencia({ repuesto }: { repuesto: Repuesto }) {
  return (
    <div className="shrink-0 text-right md:text-left">
      <p
        className={`font-bold ${repuesto.bajoMinimo ? "text-amber-700" : "text-tci-grafito"}`}
      >
        {formatearCantidad(repuesto.stockActual)} {repuesto.unidadMedida}
      </p>
      {Number(repuesto.stockMinimo) > 0 && (
        <p className="text-xs text-tci-gris">
          mín. {formatearCantidad(repuesto.stockMinimo)}
        </p>
      )}
    </div>
  );
}

function Acciones({
  repuesto,
  setDialogo,
  onAlternar,
}: {
  repuesto: Repuesto;
  setDialogo: (dialogo: Dialogo) => void;
  onAlternar: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <BotonFila onClick={() => setDialogo({ tipo: "entrada", item: repuesto })}>
        Entrada
      </BotonFila>
      <BotonFila onClick={() => setDialogo({ tipo: "salida", item: repuesto })}>
        Salida
      </BotonFila>
      <BotonFila onClick={() => setDialogo({ tipo: "libro", item: repuesto })}>
        Movimientos
      </BotonFila>
      <BotonFila onClick={() => setDialogo({ tipo: "editar", item: repuesto })}>
        Editar
      </BotonFila>
      <BotonFila onClick={onAlternar}>
        {repuesto.activo ? "Desactivar" : "Activar"}
      </BotonFila>
      <BotonFila
        peligro
        onClick={() => setDialogo({ tipo: "borrar", item: repuesto })}
        disabled={repuesto.ordenes > 0}
        titulo={
          repuesto.ordenes > 0
            ? "Se imputó a órdenes ya registradas: desactívelo en lugar de borrarlo"
            : undefined
        }
      >
        Borrar
      </BotonFila>
    </div>
  );
}

function DialogoRepuesto({
  existente,
  onCerrar,
  onGuardado,
}: {
  existente?: Repuesto;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const d = new FormData(evento.currentTarget);
    const comunes = {
      codigo: String(d.get("codigo")).trim().toUpperCase(),
      nombre: String(d.get("nombre")).trim(),
      descripcion: String(d.get("descripcion") ?? "").trim(),
      unidadMedida: String(d.get("unidadMedida")).trim(),
      stockMinimo: Number(d.get("stockMinimo") || 0),
      costoUnitario: Number(d.get("costoUnitario") || 0),
    };

    setGuardando(true);
    setError(null);
    try {
      if (existente) {
        await actualizarRepuesto(existente.id, comunes);
      } else {
        await crearRepuesto({
          ...comunes,
          // Solo al crear: despues la existencia se mueve con asientos.
          stockActual: Number(d.get("stockActual") || 0),
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
      titulo={existente ? "Editar repuesto" : "Nuevo repuesto"}
      onCerrar={onCerrar}
      bloqueado={guardando}
    >
      <form onSubmit={alEnviar} className="mt-5 space-y-4" noValidate>
        {error && <Alerta>{error}</Alerta>}

        <Campo
          etiqueta="Código"
          name="codigo"
          defaultValue={existente?.codigo}
          placeholder="ROD-6205"
          maxLength={20}
          required
          pattern="[A-Za-z0-9\-]{2,20}"
          title="Entre 2 y 20 caracteres: letras, números y guion."
        />

        <Campo
          etiqueta="Nombre"
          name="nombre"
          defaultValue={existente?.nombre}
          placeholder="Rodamiento 6205 2RS"
          required
        />

        <Campo
          etiqueta="Descripción"
          name="descripcion"
          defaultValue={existente?.descripcion ?? ""}
          placeholder="Opcional"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Unidad de medida"
            name="unidadMedida"
            defaultValue={existente?.unidadMedida}
            placeholder="unidad"
            maxLength={12}
            required
          />
          <Campo
            etiqueta="Costo unitario"
            name="costoUnitario"
            type="number"
            step="0.01"
            min="0"
            defaultValue={
              existente ? String(existente.costoUnitario) : undefined
            }
            placeholder="0.00"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {!existente && (
            <Campo
              etiqueta="Existencia inicial"
              name="stockActual"
              type="number"
              step="0.001"
              min="0"
              placeholder="0"
            />
          )}
          <Campo
            etiqueta="Mínimo"
            name="stockMinimo"
            type="number"
            step="0.001"
            min="0"
            defaultValue={existente ? String(existente.stockMinimo) : undefined}
            placeholder="0"
          />
        </div>

        <p className="rounded-lg bg-tci-humo px-3 py-2 text-xs text-tci-gris">
          {existente
            ? "La existencia no se edita aquí: se mueve con entradas y salidas, que quedan registradas."
            : "Al llegar al mínimo el repuesto aparecerá en los avisos. Un mínimo de 0 no avisa nunca."}
        </p>

        <BotonesDialogo
          onCerrar={onCerrar}
          guardando={guardando}
          texto={existente ? "Guardar cambios" : "Crear repuesto"}
        />
      </form>
    </Modal>
  );
}

function DialogoMovimiento({
  repuesto,
  sentido,
  onCerrar,
  onGuardado,
}: {
  repuesto: Repuesto;
  sentido: "entrada" | "salida";
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esEntrada = sentido === "entrada";

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const d = new FormData(evento.currentTarget);
    const datos = {
      cantidad: Number(d.get("cantidad")),
      motivo: String(d.get("motivo")).trim(),
    };

    setGuardando(true);
    setError(null);
    try {
      if (esEntrada) await registrarEntrada(repuesto.id, datos);
      else await registrarSalida(repuesto.id, datos);
      onGuardado();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "No se pudo registrar el movimiento.",
      );
      setGuardando(false);
    }
  }

  return (
    <Modal
      titulo={esEntrada ? "Entrada de almacén" : "Salida de almacén"}
      onCerrar={onCerrar}
      bloqueado={guardando}
    >
      <p className="mt-1 text-sm text-tci-gris">
        {repuesto.nombre} · quedan {formatearCantidad(repuesto.stockActual)}{" "}
        {repuesto.unidadMedida}
      </p>

      <form onSubmit={alEnviar} className="mt-5 space-y-4" noValidate>
        {error && <Alerta>{error}</Alerta>}

        <Campo
          etiqueta={`Cantidad que ${esEntrada ? "entra" : "sale"}`}
          name="cantidad"
          type="number"
          step="0.001"
          min="0.001"
          required
          placeholder="0"
        />

        <Campo
          etiqueta="Motivo"
          name="motivo"
          required
          minLength={3}
          maxLength={200}
          placeholder={
            esEntrada ? "Compra de reposición" : "Merma por rotura en bodega"
          }
        />

        <p className="rounded-lg bg-tci-humo px-3 py-2 text-xs text-tci-gris">
          El motivo queda en el libro del repuesto. Es lo que permitirá entender
          este movimiento dentro de seis meses.
        </p>

        <BotonesDialogo
          onCerrar={onCerrar}
          guardando={guardando}
          texto={esEntrada ? "Registrar entrada" : "Registrar salida"}
        />
      </form>
    </Modal>
  );
}

/** El libro de un repuesto. Solo lectura: los asientos no se editan. */
function DialogoLibro({
  repuesto,
  onCerrar,
}: {
  repuesto: Repuesto;
  onCerrar: () => void;
}) {
  const [movimientos, setMovimientos] = useState<MovimientoInventario[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    listarMovimientos(repuesto.id)
      .then((lista) => {
        if (!cancelado) setMovimientos(lista);
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setError(
            e instanceof ApiError ? e.message : "No se pudo cargar el libro.",
          );
        }
      });
    return () => {
      cancelado = true;
    };
  }, [repuesto.id]);

  return (
    <Modal titulo={`Movimientos de ${repuesto.nombre}`} onCerrar={onCerrar}>
      <div className="mt-5">
        {error && <Alerta>{error}</Alerta>}

        {!movimientos && !error && (
          <p className="text-sm text-tci-gris">Cargando...</p>
        )}

        {movimientos?.length === 0 && (
          <p className="rounded-lg bg-tci-humo px-4 py-6 text-center text-sm text-tci-gris">
            Todavía no hay movimientos. La existencia actual es la inicial.
          </p>
        )}

        {movimientos && movimientos.length > 0 && (
          <ul className="space-y-3">
            {movimientos.map((movimiento) => (
              <li
                key={movimiento.id}
                className="border-b border-tci-borde pb-3 last:border-0"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-bold text-tci-negro">
                    <span
                      className={
                        movimiento.tipo === "ENTRADA"
                          ? "text-emerald-700"
                          : "text-tci-rojo"
                      }
                    >
                      {movimiento.tipo === "ENTRADA" ? "+" : "−"}
                      {formatearCantidad(movimiento.cantidad)}
                    </span>{" "}
                    <span className="text-sm font-normal text-tci-gris">
                      {repuesto.unidadMedida}
                    </span>
                  </p>
                  <p className="text-sm text-tci-grafito">
                    quedan {formatearCantidad(movimiento.stockResultante)}
                  </p>
                </div>
                {movimiento.motivo && (
                  <p className="text-sm text-tci-grafito">
                    {movimiento.motivo}
                  </p>
                )}
                <p className="text-xs text-tci-gris">
                  {movimiento.usuario.name} ·{" "}
                  {new Date(movimiento.createdAt).toLocaleString("es-HN")}
                  {movimiento.orden && ` · ${movimiento.orden.numero}`}
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

function DialogoBorrar({
  repuesto,
  onCerrar,
  onBorrado,
}: {
  repuesto: Repuesto;
  onCerrar: () => void;
  onBorrado: () => void;
}) {
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function borrar() {
    setBorrando(true);
    setError(null);
    try {
      await eliminarRepuesto(repuesto.id);
      onBorrado();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo borrar.");
      setBorrando(false);
    }
  }

  return (
    <Modal titulo="Borrar repuesto" onCerrar={onCerrar} bloqueado={borrando}>
      <div className="mt-4 space-y-4">
        {error && <Alerta>{error}</Alerta>}
        <p className="text-sm text-tci-grafito">
          Se borrará <strong>{repuesto.nombre}</strong> del catálogo. Esta acción
          no se puede deshacer.
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
          className="h-16 animate-pulse rounded-xl border border-tci-borde bg-white"
        />
      ))}
    </div>
  );
}

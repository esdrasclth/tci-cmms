"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Alerta, BotonPrimario, Campo } from "@/components/form";
import { EncabezadoPagina, clasesArea } from "@/components/ui";
import { SelectorBuscable } from "@/components/selector-buscable";
import { ApiError } from "@/lib/api";
import {
  actualizarOrden,
  aDatetimeLocal,
  aIso,
  buscarClientes,
  buscarEquipos,
  crearOrden,
  ETIQUETA_PRIORIDAD,
  listarTiposMantenimiento,
  obtenerCliente,
  obtenerOrden,
  PRIORIDADES,
  type ClienteConSedes,
  type OrdenDetalle,
  type TipoMantenimiento,
} from "@/lib/ordenes";

/**
 * Alta y edicion de una orden de trabajo (TCI-24 / TCI-26 en la interfaz).
 *
 * El mismo formulario sirve para las dos cosas. Al editar, el cliente queda
 * fijo: el backend no lo acepta en el PATCH porque mover una orden de cliente
 * invalidaria su historial y su correlativo.
 *
 * La regla "si el tipo de mantenimiento exige equipo, el equipo es obligatorio"
 * se refleja aqui para no hacer ir al servidor por un error evitable, pero el
 * backend la vuelve a aplicar igual.
 */
export function FormularioOrden({ id }: { id?: string }) {
  const editando = id !== undefined;
  const router = useRouter();

  const [orden, setOrden] = useState<OrdenDetalle | null>(null);
  const [tipos, setTipos] = useState<TipoMantenimiento[]>([]);
  // El cliente elegido, no el catalogo entero: con mil clientes traerlos
  // todos para llenar un desplegable es trabajo tirado. Se busca en el
  // servidor y solo se guarda el que se escoge, con sus sedes.
  const [clienteCargado, setClienteCargado] = useState<ClienteConSedes | null>(
    null,
  );
  // El texto del equipo elegido. Sin lista completa, no hay de donde deducirlo.
  const [equipoTexto, setEquipoTexto] = useState("");

  const [clienteId, setClienteId] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [sedeId, setSedeId] = useState("");
  const [equipoId, setEquipoId] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carga inicial: catalogos y, si se edita, la orden.
  useEffect(() => {
    let cancelado = false;
    Promise.all([
      listarTiposMantenimiento(),
      id ? obtenerOrden(id) : Promise.resolve(null),
    ])
      .then(([tiposApi, ordenApi]) => {
        if (cancelado) return;
        setTipos(tiposApi);
        if (ordenApi) {
          setOrden(ordenApi);
          setClienteId(ordenApi.cliente.id);
          setTipoId(ordenApi.tipoMantenimiento.id);
          setSedeId(ordenApi.sede?.id ?? "");
          setEquipoId(ordenApi.equipo?.id ?? "");
          setEquipoTexto(
            ordenApi.equipo
              ? `${ordenApi.equipo.codigo} — ${ordenApi.equipo.nombre}`
              : "",
          );
        }
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setError(
            e instanceof ApiError
              ? e.message
              : "No se pudo cargar el formulario.",
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

  // Las sedes cuelgan del cliente, asi que hay que traerlo al elegirlo. Vale
  // igual para el alta y para la edicion, donde el cliente ya viene puesto.
  useEffect(() => {
    if (!clienteId) return;
    let cancelado = false;
    obtenerCliente(clienteId)
      .then((c) => {
        if (!cancelado) setClienteCargado(c);
      })
      .catch(() => {
        if (!cancelado) setClienteCargado(null);
      });
    return () => {
      cancelado = true;
    };
  }, [clienteId]);

  // Se compara el id en vez de limpiar el estado al cambiar de cliente: asi no
  // hay un `setState` sincrono en el efecto, y de paso nunca se ven las sedes
  // del cliente anterior en el instante entre elegir y que llegue el nuevo.
  const cliente = clienteCargado?.id === clienteId ? clienteCargado : null;

  const tipo = tipos.find((t) => t.id === tipoId);
  const exigeEquipo = tipo?.requiereEquipo ?? false;

  // Una sede de otro cliente no es elegible.
  const sedesVisibles = cliente?.sedes ?? [];

  const buscarOpcionesCliente = useCallback(
    async (consulta: string) =>
      (await buscarClientes(consulta)).map((c) => ({
        valor: c.id,
        texto: c.nombre,
        detalle: c.rtn ? `RTN ${c.rtn}` : undefined,
      })),
    [],
  );

  const buscarOpcionesEquipo = useCallback(
    async (consulta: string) => {
      if (!clienteId) return [];
      const lista = await buscarEquipos(clienteId, consulta);
      // Un equipo de otra sede del mismo cliente no es elegible; los que no
      // tienen sede valen para cualquiera.
      const visibles = sedeId
        ? lista.filter((e) => e.sedeId === null || e.sedeId === sedeId)
        : lista;
      return visibles.map((e) => ({
        valor: e.id,
        texto: `${e.codigo} — ${e.nombre}`,
      }));
    },
    [clienteId, sedeId],
  );

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);

    if (exigeEquipo && !equipoId) {
      setError(`El tipo '${tipo?.nombre}' exige indicar un equipo.`);
      return;
    }

    const comunes = {
      titulo: String(datos.get("titulo")).trim(),
      descripcionProblema: String(datos.get("descripcionProblema")).trim(),
      tipoMantenimientoId: tipoId,
      prioridad: datos.get("prioridad") as (typeof PRIORIDADES)[number],
      ...(sedeId ? { sedeId } : {}),
      ...(equipoId ? { equipoId } : {}),
      ...(aIso(String(datos.get("fechaProgramada") ?? ""))
        ? { fechaProgramada: aIso(String(datos.get("fechaProgramada"))) }
        : {}),
      ...(aIso(String(datos.get("fechaLimite") ?? ""))
        ? { fechaLimite: aIso(String(datos.get("fechaLimite"))) }
        : {}),
    };

    setGuardando(true);
    setError(null);
    try {
      const guardada = editando
        ? await actualizarOrden(id, comunes)
        : await crearOrden({ ...comunes, clienteId });
      router.push(`/panel/ordenes/${guardada.id}`);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "No se pudo guardar la orden.",
      );
      setGuardando(false);
    }
  }

  if (cargando) {
    return <p className="text-sm text-tci-gris">Cargando formulario...</p>;
  }

  if (editando && !orden) {
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

  const volverA = editando ? `/panel/ordenes/${id}` : "/panel";

  return (
    <div className="max-w-2xl">
      <EncabezadoPagina
        volver={{
          href: volverA,
          texto: editando ? "Volver a la orden" : "Volver al listado",
        }}
        titulo={editando ? `Editar ${orden?.numero}` : "Nueva orden de trabajo"}
        descripcion={
          editando ? undefined : (
            <>
              La orden nace <strong>Pendiente</strong>. El tecnico se asigna
              despues, desde el detalle.
            </>
          )
        }
      />

      <form onSubmit={alEnviar} className="mt-7 space-y-5" noValidate>
        {error && <Alerta>{error}</Alerta>}

        <Campo
          etiqueta="Titulo"
          name="titulo"
          defaultValue={orden?.titulo}
          placeholder="Compresor no arranca"
          maxLength={120}
          required
        />

        <div>
          <label
            htmlFor="descripcionProblema"
            className="mb-1.5 block text-sm font-bold text-tci-negro"
          >
            Problema reportado
          </label>
          <textarea
            id="descripcionProblema"
            name="descripcionProblema"
            rows={4}
            defaultValue={orden?.descripcionProblema}
            placeholder="Que reporta el cliente, con el detalle que haga falta."
            required
            className={clasesArea()}
          />
        </div>

        <div>
          <SelectorBuscable
            id="clienteId"
            etiqueta="Cliente"
            valor={clienteId}
            textoSeleccionado={cliente?.nombre}
            onCambio={(v) => {
              setClienteId(v);
              // Sede y equipo pertenecen al cliente anterior: se limpian.
              setSedeId("");
              setEquipoId("");
              setEquipoTexto("");
            }}
            deshabilitado={editando}
            buscar={buscarOpcionesCliente}
            placeholder="Busque por nombre, RTN o contacto..."
          />
          {editando && (
            <p className="mt-1 text-xs text-tci-gris">
              El cliente no se puede cambiar. Si esta mal, cancele la orden y
              cree otra.
            </p>
          )}
        </div>

        <Selector
          id="sedeId"
          etiqueta="Sede (opcional)"
          valor={sedeId}
          onCambio={(v) => {
            setSedeId(v);
            setEquipoId("");
          }}
          deshabilitado={!clienteId || sedesVisibles.length === 0}
          opciones={sedesVisibles.map((s) => ({
            valor: s.id,
            texto: s.ciudad ? `${s.nombre} (${s.ciudad})` : s.nombre,
          }))}
          placeholder={clienteId ? "Sin sede" : "Elija primero un cliente"}
        />

        <Selector
          id="tipoMantenimientoId"
          etiqueta="Tipo de mantenimiento"
          valor={tipoId}
          onCambio={setTipoId}
          opciones={tipos.map((t) => ({
            valor: t.id,
            texto: t.requiereEquipo ? `${t.nombre} (exige equipo)` : t.nombre,
          }))}
          placeholder="Elija un tipo"
        />

        <SelectorBuscable
          id="equipoId"
          etiqueta={exigeEquipo ? "Equipo" : "Equipo (opcional)"}
          valor={equipoId}
          textoSeleccionado={equipoTexto}
          onCambio={(v, texto) => {
            setEquipoId(v);
            setEquipoTexto(texto);
          }}
          deshabilitado={!clienteId}
          buscar={buscarOpcionesEquipo}
          placeholder={
            clienteId
              ? "Busque por codigo, nombre, marca o serie..."
              : "Elija primero un cliente"
          }
        />

        <div>
          <label
            htmlFor="prioridad"
            className="mb-1.5 block text-sm font-bold text-tci-negro"
          >
            Prioridad
          </label>
          <select
            id="prioridad"
            name="prioridad"
            defaultValue={orden?.prioridad ?? "MEDIA"}
            className="w-full rounded-lg border border-tci-borde bg-white px-4 py-3 text-sm text-tci-negro"
          >
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>
                {ETIQUETA_PRIORIDAD[p]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo
            etiqueta="Fecha programada"
            name="fechaProgramada"
            type="datetime-local"
            defaultValue={aDatetimeLocal(orden?.fechaProgramada ?? null)}
          />
          <Campo
            etiqueta="Fecha limite (SLA)"
            name="fechaLimite"
            type="datetime-local"
            defaultValue={aDatetimeLocal(orden?.fechaLimite ?? null)}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            href={volverA}
            className="flex-1 rounded-lg border border-tci-borde px-4 py-3 text-center text-sm font-bold text-tci-negro hover:bg-tci-humo"
          >
            Cancelar
          </Link>
          <div className="flex-1">
            <BotonPrimario
              type="submit"
              cargando={guardando}
              disabled={!clienteId || !tipoId}
            >
              {guardando
                ? "Guardando..."
                : editando
                  ? "Guardar cambios"
                  : "Crear orden"}
            </BotonPrimario>
          </div>
        </div>
      </form>
    </div>
  );
}

function Selector({
  id,
  etiqueta,
  valor,
  onCambio,
  opciones,
  placeholder,
  deshabilitado = false,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  onCambio: (valor: string) => void;
  opciones: { valor: string; texto: string }[];
  placeholder: string;
  deshabilitado?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-bold text-tci-negro"
      >
        {etiqueta}
      </label>
      <select
        id={id}
        name={id}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        disabled={deshabilitado}
        className="w-full rounded-lg border border-tci-borde bg-white px-4 py-3 text-sm text-tci-negro disabled:cursor-not-allowed disabled:bg-tci-humo disabled:text-tci-gris"
      >
        <option value="">{placeholder}</option>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </div>
  );
}

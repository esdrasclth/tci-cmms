"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { Alerta, BotonPrimario, Campo } from "@/components/form";
import { Boton, clasesArea } from "@/components/ui";
import { CONFIG_ACCION, type Accion, type Tecnico } from "@/lib/ordenes";
import { useTrampaFoco } from "@/lib/hooks";

/**
 * Formulario de una transicion (TCI-42).
 *
 * Lo que pide cada accion sale de CONFIG_ACCION, que espeja la tabla de
 * OrdenEstadoService. Aun asi el backend vuelve a validar todo: esto es
 * comodidad para el usuario, no un control.
 */
export function DialogoAccion({
  accion,
  tecnicos,
  cargandoTecnicos,
  enviando,
  error,
  onCerrar,
  onConfirmar,
}: {
  accion: Accion;
  tecnicos: Tecnico[];
  cargandoTecnicos: boolean;
  enviando: boolean;
  error: string | null;
  onCerrar: () => void;
  onConfirmar: (cuerpo: Record<string, unknown>) => void;
}) {
  const config = CONFIG_ACCION[accion];
  const primerCampo = useRef<HTMLTextAreaElement | HTMLSelectElement>(null);
  // La trampa enfoca el primer campo al abrir y devuelve el foco al cerrar.
  // Antes solo hacia lo primero, y con Tab se salia del dialogo.
  const panel = useTrampaFoco<HTMLDivElement>(true, primerCampo);

  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !enviando) onCerrar();
    };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [onCerrar, enviando]);

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);

    switch (config.pide) {
      case "motivo":
        onConfirmar({ motivo: String(datos.get("motivo")).trim() });
        break;
      case "tecnico":
        onConfirmar({ tecnicoId: String(datos.get("tecnicoId")) });
        break;
      case "cierre": {
        const horas = String(datos.get("horasTrabajadas") ?? "").trim();
        const costo = String(datos.get("costoManoObra") ?? "").trim();
        onConfirmar({
          trabajoRealizado: String(datos.get("trabajoRealizado")).trim(),
          ...(horas ? { horasTrabajadas: Number(horas) } : {}),
          ...(costo ? { costoManoObra: Number(costo) } : {}),
        });
        break;
      }
      default: {
        const comentario = String(datos.get("comentario") ?? "").trim();
        onConfirmar(comentario ? { comentario } : {});
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !enviando) onCerrar();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-labelledby="titulo-dialogo"
        className="max-h-full w-full overflow-y-auto rounded-t-2xl bg-white p-6 sm:max-w-lg sm:rounded-2xl"
      >
        <h2 id="titulo-dialogo" className="text-xl font-bold text-tci-negro">
          {config.etiqueta}
        </h2>

        <form onSubmit={alEnviar} className="mt-5 space-y-4" noValidate>
          {error && <Alerta>{error}</Alerta>}

          {config.pide === "motivo" && (
            <AreaTexto
              ref={primerCampo as React.Ref<HTMLTextAreaElement>}
              nombre="motivo"
              etiqueta="Motivo"
              ayuda="Queda registrado en el historial de la orden."
              requerido
            />
          )}

          {config.pide === "tecnico" && (
            <div>
              <label
                htmlFor="tecnicoId"
                className="mb-1.5 block text-sm font-bold text-tci-negro"
              >
                Tecnico
              </label>
              <select
                ref={primerCampo as React.Ref<HTMLSelectElement>}
                id="tecnicoId"
                name="tecnicoId"
                required
                disabled={cargandoTecnicos || tecnicos.length === 0}
                className="w-full rounded-lg border border-tci-borde bg-white px-4 py-3 text-sm text-tci-negro disabled:bg-tci-humo"
              >
                {cargandoTecnicos ? (
                  <option>Cargando...</option>
                ) : tecnicos.length === 0 ? (
                  <option value="">No hay tecnicos activos</option>
                ) : (
                  tecnicos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {config.pide === "cierre" && (
            <>
              <AreaTexto
                ref={primerCampo as React.Ref<HTMLTextAreaElement>}
                nombre="trabajoRealizado"
                etiqueta="Trabajo realizado"
                ayuda="Minimo 10 caracteres. Es obligatorio para cerrar la orden."
                requerido
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo
                  etiqueta="Horas trabajadas"
                  name="horasTrabajadas"
                  type="number"
                  step="0.25"
                  min="0"
                  placeholder="2.5"
                />
                <Campo
                  etiqueta="Costo mano de obra"
                  name="costoManoObra"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="1200.00"
                />
              </div>
            </>
          )}

          {config.pide === "nada" && (
            <AreaTexto
              ref={primerCampo as React.Ref<HTMLTextAreaElement>}
              nombre="comentario"
              etiqueta="Comentario (opcional)"
              ayuda="Si escribe algo, queda en el historial."
            />
          )}

          <div className="flex gap-3 pt-2">
            <Boton
              type="button"
              onClick={onCerrar}
              disabled={enviando}
              variante="secundario"
              className="flex-1"
            >
              Cancelar
            </Boton>
            <div className="flex-1">
              <BotonPrimario type="submit" cargando={enviando}>
                {enviando ? "Guardando..." : "Confirmar"}
              </BotonPrimario>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function AreaTexto({
  ref,
  nombre,
  etiqueta,
  ayuda,
  requerido = false,
}: {
  ref?: React.Ref<HTMLTextAreaElement>;
  nombre: string;
  etiqueta: string;
  ayuda?: string;
  requerido?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={nombre}
        className="mb-1.5 block text-sm font-bold text-tci-negro"
      >
        {etiqueta}
      </label>
      <textarea
        ref={ref}
        id={nombre}
        name={nombre}
        rows={3}
        required={requerido}
        aria-describedby={ayuda ? `${nombre}-ayuda` : undefined}
        className={clasesArea()}
      />
      {ayuda && (
        <p id={`${nombre}-ayuda`} className="mt-1 text-xs text-tci-gris">
          {ayuda}
        </p>
      )}
    </div>
  );
}

/** Estado del dialogo, para que el detalle no lo tenga que reimplementar. */
export function useDialogoAccion() {
  const [accion, setAccion] = useState<Accion | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return {
    accion,
    enviando,
    error,
    abrir: (a: Accion) => {
      setError(null);
      setAccion(a);
    },
    cerrar: () => {
      setAccion(null);
      setError(null);
    },
    setEnviando,
    setError,
  };
}

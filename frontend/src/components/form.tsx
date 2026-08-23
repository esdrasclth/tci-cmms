"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";

const CLASES_INPUT =
  "w-full rounded-lg border border-tci-borde bg-white px-4 py-3 text-sm text-tci-negro " +
  "placeholder:text-tci-gris/70 transition-colors " +
  "hover:border-tci-gris/60 focus:border-tci-rojo focus:outline-none " +
  "disabled:cursor-not-allowed disabled:bg-tci-humo";

type CampoProps = InputHTMLAttributes<HTMLInputElement> & {
  etiqueta: string;
  error?: string;
};

export function Campo({ etiqueta, error, id, ...props }: CampoProps) {
  const generado = useId();
  const idCampo = id ?? generado;
  const idError = `${idCampo}-error`;

  return (
    <div>
      <label
        htmlFor={idCampo}
        className="mb-1.5 block text-sm font-bold text-tci-negro"
      >
        {etiqueta}
      </label>
      <input
        {...props}
        id={idCampo}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idError : undefined}
        className={`${CLASES_INPUT} ${error ? "border-tci-rojo" : ""}`}
      />
      {error && (
        <p id={idError} className="mt-1.5 text-xs text-tci-rojo">
          {error}
        </p>
      )}
    </div>
  );
}

/** Campo de contrasena con el ojo para mostrarla, como en la referencia. */
export function CampoContrasena({
  etiqueta,
  error,
  id,
  ...props
}: Omit<CampoProps, "type">) {
  const generado = useId();
  const idCampo = id ?? generado;
  const idError = `${idCampo}-error`;
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label
        htmlFor={idCampo}
        className="mb-1.5 block text-sm font-bold text-tci-negro"
      >
        {etiqueta}
      </label>
      <div className="relative">
        <input
          {...props}
          id={idCampo}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? idError : undefined}
          className={`${CLASES_INPUT} pr-12 ${error ? "border-tci-rojo" : ""}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          // El estado va en el texto accesible, no solo en el icono.
          aria-label={visible ? "Ocultar contrasena" : "Mostrar contrasena"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-tci-gris transition-colors hover:text-tci-negro"
        >
          <IconoOjo tachado={visible} />
        </button>
      </div>
      {error && (
        <p id={idError} className="mt-1.5 text-xs text-tci-rojo">
          {error}
        </p>
      )}
    </div>
  );
}

export function BotonPrimario({
  children,
  cargando = false,
  ...props
}: InputHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  cargando?: boolean;
  type?: "submit" | "button";
}) {
  return (
    <button
      {...props}
      disabled={cargando || props.disabled}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-tci-rojo px-4 py-3.5 text-sm font-bold text-white transition-colors hover:bg-tci-rojo-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      {cargando && <Girador />}
      {children}
    </button>
  );
}

/** Error del servidor o de red. `role="alert"` para que el lector lo anuncie. */
export function Alerta({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-tci-rojo/30 bg-tci-rojo/5 px-4 py-3 text-sm text-tci-rojo"
    >
      {children}
    </div>
  );
}

function Girador() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="3"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconoOjo({ tachado }: { tachado: boolean }) {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.8" />
      {tachado && <path d="m4 20 16-16" />}
    </svg>
  );
}

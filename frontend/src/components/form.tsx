"use client";

import {
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Boton } from "@/components/ui";

/**
 * Primitivas de formulario.
 *
 * Los campos existen en dos tamanos y no en uno. `md` (44px en movil, 36px en
 * escritorio) es la del panel: alinea con `Boton` del mismo tamano, que es lo
 * que hace que un campo y su boton de al lado queden a ras. `lg` es la de las
 * pantallas de autenticacion, cuyo diseno viene de la referencia que dio el
 * cliente (`branding/idea-login.jpg`) y no debe encogerse: ahi el formulario es
 * el unico contenido de la pantalla y la holgura es parte del diseno.
 *
 * Ver el cabezal de `ui.tsx` para por que las alturas son explicitas.
 */

const ALTURA_CAMPO = {
  md: "h-11 px-3.5 text-sm md:h-9",
  lg: "h-12 px-4 text-[0.9375rem]",
} as const;

type Tamano = keyof typeof ALTURA_CAMPO;

const CLASES_INPUT =
  "w-full rounded-lg border border-tci-borde bg-white text-tci-negro " +
  "placeholder:text-tci-gris/70 transition-colors " +
  "hover:border-tci-gris/60 focus:border-tci-rojo focus:outline-none " +
  "disabled:cursor-not-allowed disabled:bg-tci-humo";

function clasesInput(tamano: Tamano, error?: string) {
  return `${CLASES_INPUT} ${ALTURA_CAMPO[tamano]} ${error ? "border-tci-rojo" : ""}`;
}

function Etiqueta({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-semibold tracking-[-0.01em] text-tci-negro"
    >
      {children}
    </label>
  );
}

function Error({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1.5 text-xs text-tci-rojo">
      {children}
    </p>
  );
}

type CampoProps = InputHTMLAttributes<HTMLInputElement> & {
  etiqueta: string;
  error?: string;
  tamano?: Tamano;
};

export function Campo({
  etiqueta,
  error,
  id,
  tamano = "md",
  ...props
}: CampoProps) {
  const generado = useId();
  const idCampo = id ?? generado;
  const idError = `${idCampo}-error`;

  return (
    <div>
      <Etiqueta htmlFor={idCampo}>{etiqueta}</Etiqueta>
      <input
        {...props}
        id={idCampo}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idError : undefined}
        className={clasesInput(tamano, error)}
      />
      {error && <Error id={idError}>{error}</Error>}
    </div>
  );
}

/** Campo de contrasena con el ojo para mostrarla, como en la referencia. */
export function CampoContrasena({
  etiqueta,
  error,
  id,
  tamano = "md",
  ...props
}: Omit<CampoProps, "type">) {
  const generado = useId();
  const idCampo = id ?? generado;
  const idError = `${idCampo}-error`;
  const [visible, setVisible] = useState(false);

  // El boton del ojo se mete dentro del campo, asi que su ancho tiene que
  // seguir la altura o queda un cuadrado desproporcionado en el campo corto.
  const anchoOjo = tamano === "lg" ? "w-12" : "w-11 md:w-10";
  const reserva = tamano === "lg" ? "pr-12" : "pr-11 md:pr-10";

  return (
    <div>
      <Etiqueta htmlFor={idCampo}>{etiqueta}</Etiqueta>
      <div className="relative">
        <input
          {...props}
          id={idCampo}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? idError : undefined}
          className={`${clasesInput(tamano, error)} ${reserva}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          // El estado va en el texto accesible, no solo en el icono.
          aria-label={visible ? "Ocultar contrasena" : "Mostrar contrasena"}
          aria-pressed={visible}
          className={`absolute inset-y-0 right-0 flex ${anchoOjo} items-center justify-center rounded-r-lg text-tci-gris transition-colors hover:text-tci-negro`}
        >
          <IconoOjo tachado={visible} />
        </button>
      </div>
      {error && <Error id={idError}>{error}</Error>}
    </div>
  );
}

/**
 * Boton de enviar de ancho completo. Se conserva porque lo usan siete pantallas
 * y su semantica es clara, pero ya no tiene estilos propios: delega en `Boton`
 * para que no vuelvan a divergir.
 */
export function BotonPrimario({
  children,
  cargando = false,
  tamano = "lg",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  cargando?: boolean;
  tamano?: Tamano;
  type?: "submit" | "button";
}) {
  return (
    <Boton
      {...props}
      variante="primario"
      tamano={tamano}
      cargando={cargando}
      className={`w-full ${className}`}
    >
      {children}
    </Boton>
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

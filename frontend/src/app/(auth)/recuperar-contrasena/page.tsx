"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { AuthShell } from "@/components/auth-shell";
import { Alerta, BotonPrimario, Campo } from "@/components/form";
import { requestPasswordReset } from "@/lib/auth-client";

/**
 * TCI-34 — solicitud del enlace de restablecimiento.
 *
 * **La respuesta es la misma exista o no la cuenta.** Decir "ese correo no está
 * registrado" permitiría averiguar qué direcciones tienen cuenta probándolas una
 * a una, y en un sistema cerrado como este —donde las altas las hace un
 * administrador— eso es justo lo que no se quiere regalar.
 *
 * El aviso sobre el correo pendiente se mantiene a la vista: mientras TCI no
 * tenga dominio propio, el enlace no llega y la salida real sigue siendo pedirle
 * al administrador que asigne una contraseña.
 */
export default function RecuperarContrasenaPage() {
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const correo = String(new FormData(evento.currentTarget).get("email"));

    setCargando(true);
    setError(null);
    try {
      await requestPasswordReset({
        email: correo,
        redirectTo: `${window.location.origin}/restablecer-contrasena`,
      });
      // Sin mirar el resultado a propósito: la respuesta no distingue si la
      // cuenta existe, y tratarla distinto aquí desharía esa protección.
      setEnviado(true);
    } catch {
      setError("No se pudo conectar con el servidor. Intente de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  if (enviado) {
    return (
      <AuthShell
        titulo="Revise su correo"
        subtitulo="Si esa dirección tiene una cuenta, le llegará un enlace para cambiar la contraseña."
      >
        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-tci-grafito">
            El enlace caduca en una hora. Si no aparece en unos minutos, revise
            la carpeta de correo no deseado.
          </p>

          <Aviso />

          <Link
            href="/login"
            className="block text-center text-sm font-semibold text-tci-negro underline-offset-2 hover:text-tci-rojo hover:underline"
          >
            &larr; Volver al inicio de sesión
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      titulo="¿Olvidó su contraseña?"
      subtitulo="Escriba su correo y le enviaremos un enlace para cambiarla."
    >
      <form onSubmit={alEnviar} className="space-y-5" noValidate>
        {error && <Alerta>{error}</Alerta>}

        <Campo
          tamano="lg"
          etiqueta="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="usuario@tcihn.com"
          required
        />

        <BotonPrimario type="submit" cargando={cargando}>
          {cargando ? "Enviando..." : "Enviarme el enlace"}
        </BotonPrimario>

        <Aviso />

        <Link
          href="/login"
          className="block text-center text-sm font-semibold text-tci-negro underline-offset-2 hover:text-tci-rojo hover:underline"
        >
          &larr; Volver al inicio de sesión
        </Link>
      </form>
    </AuthShell>
  );
}

/**
 * El envío de correo está pendiente de que TCI confirme su dominio. Decirlo
 * aquí evita que alguien espere un correo que hoy no sale.
 */
function Aviso() {
  return (
    <div className="rounded-lg bg-tci-humo px-4 py-3 text-xs leading-relaxed text-tci-gris">
      <p className="font-semibold text-tci-negro">
        El envío de correo aún no está activo
      </p>
      <p className="mt-1">
        Está pendiente de configurar el dominio de TCI. Mientras tanto,
        cualquier administrador puede asignarle una contraseña nueva desde el
        panel de usuarios; es cuestión de minutos.
      </p>
      <p className="mt-2">
        <a
          href="mailto:cotizaciones@tcihn.com"
          className="underline-offset-2 hover:text-tci-rojo hover:underline"
        >
          cotizaciones@tcihn.com
        </a>{" "}
        · +504 9565-9697
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { AuthShell } from "@/components/auth-shell";
import { Alerta, BotonPrimario, CampoContrasena } from "@/components/form";
import { resetPassword } from "@/lib/auth-client";

/**
 * TCI-34 — cambio de contraseña con el token del correo.
 *
 * El token viaja en la URL, así que la página se lee con `useSearchParams` y va
 * envuelta en `Suspense`: sin eso Next no puede prerenderizar la ruta.
 */
export default function RestablecerContrasenaPage() {
  return (
    <Suspense fallback={null}>
      <Formulario />
    </Suspense>
  );
}

function Formulario() {
  const router = useRouter();
  const parametros = useSearchParams();
  const token = parametros.get("token");

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sin token no hay nada que hacer: se llega aquí desde el enlace del correo.
  if (!token) {
    return (
      <AuthShell
        titulo="Enlace no válido"
        subtitulo="Falta el código del enlace o está incompleto."
      >
        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-tci-grafito">
            Copie el enlace completo del correo, o pida uno nuevo.
          </p>
          <Link
            href="/recuperar-contrasena"
            className="block text-center text-sm font-semibold text-tci-negro underline-offset-2 hover:text-tci-rojo hover:underline"
          >
            Pedir un enlace nuevo
          </Link>
        </div>
      </AuthShell>
    );
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const d = new FormData(evento.currentTarget);
    const nueva = String(d.get("password"));
    const repetida = String(d.get("repetir"));

    if (nueva !== repetida) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    setError(null);
    const { error: fallo } = await resetPassword({
      newPassword: nueva,
      token: token!,
    });

    if (fallo) {
      // El caso normal es un enlace caducado o ya usado; ambos se arreglan
      // pidiendo otro, así que el mensaje lo dice en vez de dar un código.
      setError(
        "El enlace ya no sirve: puede haber caducado o haberse usado. Pida uno nuevo.",
      );
      setCargando(false);
      return;
    }

    router.push("/login");
  }

  return (
    <AuthShell
      titulo="Nueva contraseña"
      subtitulo="Elija una contraseña de al menos 8 caracteres."
    >
      <form onSubmit={alEnviar} className="space-y-5" noValidate>
        {error && <Alerta>{error}</Alerta>}

        <CampoContrasena
          tamano="lg"
          etiqueta="Nueva contraseña"
          name="password"
          autoComplete="new-password"
          placeholder="Al menos 8 caracteres"
          minLength={8}
          required
        />

        <CampoContrasena
          tamano="lg"
          etiqueta="Repita la contraseña"
          name="repetir"
          autoComplete="new-password"
          placeholder="La misma otra vez"
          minLength={8}
          required
        />

        <BotonPrimario type="submit" cargando={cargando}>
          {cargando ? "Guardando..." : "Cambiar contraseña"}
        </BotonPrimario>

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

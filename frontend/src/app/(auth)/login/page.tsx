"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthShell } from "@/components/auth-shell";
import {
  Alerta,
  BotonPrimario,
  Campo,
  CampoContrasena,
} from "@/components/form";
import { authClient, signIn, signOut } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    setCargando(true);

    const datos = new FormData(evento.currentTarget);
    const { error } = await signIn.email({
      email: String(datos.get("email")),
      password: String(datos.get("password")),
      rememberMe: datos.get("recordarme") === "on",
    });

    if (error) {
      setError(mensajeDeError(error.status));
      setCargando(false);
      return;
    }

    // Un usuario dado de baja (TCI-35) conserva su contrasena: Better Auth lo
    // deja entrar y es aqui donde se corta la sesion.
    const { data: sesion } = await authClient.getSession();
    if (sesion && sesion.user.activo === false) {
      await signOut();
      setError("Su cuenta esta desactivada. Contacte al administrador.");
      setCargando(false);
      return;
    }

    router.push("/panel");
    router.refresh();
  }

  return (
    <AuthShell
      titulo="Bienvenido de nuevo"
      subtitulo="Ingrese para gestionar las ordenes de trabajo."
    >
      <form onSubmit={alEnviar} className="space-y-5" noValidate>
        {error && <Alerta>{error}</Alerta>}

        <Campo
          etiqueta="Correo"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="usuario@tcihn.com"
          required
        />

        <CampoContrasena
          etiqueta="Contrasena"
          name="password"
          autoComplete="current-password"
          placeholder="Su contrasena"
          required
        />

        <div className="flex items-center justify-between gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-tci-gris">
            <input
              type="checkbox"
              name="recordarme"
              defaultChecked
              className="h-4 w-4 cursor-pointer rounded border-tci-borde accent-tci-rojo"
            />
            Recordarme
          </label>
          <Link
            href="/recuperar-contrasena"
            className="text-sm text-tci-gris underline-offset-2 hover:text-tci-rojo hover:underline"
          >
            Olvide mi contrasena
          </Link>
        </div>

        <BotonPrimario type="submit" cargando={cargando}>
          {cargando ? "Ingresando..." : "Ingresar"}
        </BotonPrimario>

        {/* No hay registro publico: el backend tiene `disableSignUp` y las
            cuentas las da de alta un administrador (TCI-35). */}
        <p className="pt-1 text-center text-sm text-tci-gris">
          Las cuentas las crea un administrador. Si necesita acceso,
          solicitelo a su supervisor.
        </p>
      </form>
    </AuthShell>
  );
}

/**
 * Better Auth devuelve el detalle en ingles. Se traduce por codigo y, a
 * proposito, no se distingue "correo no existe" de "contrasena incorrecta":
 * eso permitiria enumerar usuarios.
 */
function mensajeDeError(status?: number): string {
  if (status === 401 || status === 403) {
    return "Correo o contrasena incorrectos.";
  }
  if (status === 429) {
    return "Demasiados intentos. Espere un momento antes de reintentar.";
  }
  if (status === 0 || status === undefined) {
    return "No se pudo conectar con el servidor. Verifique que la API este arriba.";
  }
  return "No se pudo iniciar sesion. Intente de nuevo.";
}

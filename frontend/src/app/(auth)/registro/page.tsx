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
import { signUp } from "@/lib/auth-client";

/** Lo exige el backend (`minPasswordLength` en auth.config.ts). */
const LARGO_MINIMO = 8;

export default function RegistroPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    setErrores({});

    const datos = new FormData(evento.currentTarget);
    const password = String(datos.get("password"));
    const confirmacion = String(datos.get("confirmacion"));

    // Se valida antes de salir a la red: el backend no conoce la confirmacion.
    const nuevos: Record<string, string> = {};
    if (password.length < LARGO_MINIMO) {
      nuevos.password = `Debe tener al menos ${LARGO_MINIMO} caracteres.`;
    }
    if (password !== confirmacion) {
      nuevos.confirmacion = "Las contrasenas no coinciden.";
    }
    if (Object.keys(nuevos).length > 0) {
      setErrores(nuevos);
      return;
    }

    setCargando(true);
    const telefono = String(datos.get("telefono") ?? "").trim();
    const { error } = await signUp.email({
      name: String(datos.get("name")).trim(),
      email: String(datos.get("email")).trim(),
      password,
      ...(telefono ? { telefono } : {}),
    });

    if (error) {
      if (error.status === 422 || error.code === "USER_ALREADY_EXISTS") {
        setErrores({ email: "Ya existe una cuenta con este correo." });
      } else if (error.status === 0 || error.status === undefined) {
        setError(
          "No se pudo conectar con el servidor. Verifique que la API este arriba.",
        );
      } else {
        setError("No se pudo crear la cuenta. Intente de nuevo.");
      }
      setCargando(false);
      return;
    }

    // signUp deja la sesion iniciada.
    router.push("/panel");
    router.refresh();
  }

  return (
    <AuthShell
      titulo="Cree su cuenta"
      subtitulo="Registrese para dar seguimiento a sus ordenes de trabajo."
    >
      <form onSubmit={alEnviar} className="space-y-5" noValidate>
        {error && <Alerta>{error}</Alerta>}

        <Campo
          etiqueta="Nombre completo"
          name="name"
          autoComplete="name"
          placeholder="Juan Perez"
          required
        />

        <Campo
          etiqueta="Correo"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="usuario@tcihn.com"
          error={errores.email}
          required
        />

        <Campo
          etiqueta="Telefono (opcional)"
          name="telefono"
          type="tel"
          autoComplete="tel"
          placeholder="+504 9999-9999"
        />

        <CampoContrasena
          etiqueta="Contrasena"
          name="password"
          autoComplete="new-password"
          placeholder={`Minimo ${LARGO_MINIMO} caracteres`}
          error={errores.password}
          required
        />

        <CampoContrasena
          etiqueta="Confirme la contrasena"
          name="confirmacion"
          autoComplete="new-password"
          placeholder="Repita la contrasena"
          error={errores.confirmacion}
          required
        />

        {/* El rol no se elige al registrarse: es `input: false` en el backend. */}
        <p className="rounded-lg bg-tci-humo px-4 py-3 text-xs leading-relaxed text-tci-gris">
          Las cuentas nuevas se crean con perfil de <strong>Tecnico</strong>. Un
          administrador asigna los permisos adicionales.
        </p>

        <BotonPrimario type="submit" cargando={cargando}>
          {cargando ? "Creando cuenta..." : "Crear cuenta"}
        </BotonPrimario>

        <p className="pt-1 text-center text-sm text-tci-gris">
          Ya tiene cuenta?{" "}
          <Link
            href="/login"
            className="font-bold text-tci-negro underline-offset-2 hover:text-tci-rojo hover:underline"
          >
            Inicie sesion
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

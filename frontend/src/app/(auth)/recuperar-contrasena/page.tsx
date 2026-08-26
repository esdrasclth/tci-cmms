import Link from "next/link";

import { AuthShell } from "@/components/auth-shell";

export const metadata = { title: "Recuperar contraseña" };

/**
 * TCI-34 todavia no existe: la recuperacion necesita un servicio de correo, que
 * llega con el modulo 8 (Notificaciones). La pantalla existe para que el enlace
 * del login no quede muerto y para decir que hacer mientras tanto.
 */
export default function RecuperarContrasenaPage() {
  return (
    <AuthShell
      titulo="¿Olvidó su contraseña?"
      subtitulo="El restablecimiento por correo todavía no está disponible."
    >
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-tci-grafito">
          Mientras se habilita, cualquier administrador de TCI puede asignarle
          una contraseña nueva desde el panel de usuarios. Es cuestión de
          minutos: pídaselo y vuelva a entrar.
        </p>

        <div className="rounded-lg bg-tci-humo px-4 py-4 text-sm text-tci-gris">
          <p className="font-semibold text-tci-negro">¿No sabe a quién pedírselo?</p>
          <p className="mt-1">
            <a
              href="mailto:cotizaciones@tcihn.com"
              className="underline-offset-2 hover:text-tci-rojo hover:underline"
            >
              cotizaciones@tcihn.com
            </a>
          </p>
          <p>+504 9565-9697</p>
        </div>

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

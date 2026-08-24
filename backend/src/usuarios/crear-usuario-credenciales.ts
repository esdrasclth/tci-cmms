import { createLocalAccountIssuer } from '@better-auth/core/db';

import type { Rol } from '../generated/prisma/enums';
import type { Auth } from '../auth/auth.config';

/**
 * Alta de usuario con correo y contrasena, sin pasar por el endpoint publico.
 *
 * El registro publico esta cerrado (`disableSignUp` en auth.config.ts): las
 * cuentas las crea un administrador. Esta funcion reproduce exactamente lo que
 * hacia el endpoint de sign-up, reutilizando las piezas internas de Better Auth
 * en vez de reimplementarlas:
 *
 *   1. `password.hash` — el hash tiene que ser el mismo que espera el login.
 *   2. `internalAdapter.createUser` — aplica los additionalFields y los hooks.
 *   3. `internalAdapter.linkAccount` — la fila de `accounts` con
 *      providerId `credential` e issuer `local:credential`.
 *
 * Hacerlo a mano contra Prisma funcionaria hoy y se romperia en la primera
 * version de Better Auth que cambie el formato del hash o la forma de la cuenta.
 *
 * Se usa desde UsuariosService y desde prisma/seed.ts (que crea el primer
 * administrador, porque sin registro publico no habria como entrar).
 */

export class UsuarioYaExisteError extends Error {
  constructor(readonly email: string) {
    super(`Ya existe un usuario con el correo ${email}.`);
    this.name = 'UsuarioYaExisteError';
  }
}

export interface DatosUsuarioNuevo {
  name: string;
  email: string;
  password: string;
  rol: Rol;
  telefono?: string | null;
}

export async function crearUsuarioConCredenciales(
  auth: Auth,
  datos: DatosUsuarioNuevo,
) {
  const ctx = await auth.$context;
  const email = datos.email.trim().toLowerCase();

  const existente = await ctx.internalAdapter.findUserByEmail(email);
  if (existente?.user) {
    throw new UsuarioYaExisteError(email);
  }

  // Antes de crear el usuario, igual que en el sign-up original: si el hasheo
  // falla, no queremos dejar un usuario sin credenciales.
  const hash = await ctx.password.hash(datos.password);

  const usuario = await ctx.internalAdapter.createUser(
    {
      email,
      name: datos.name.trim(),
      emailVerified: false,
      rol: datos.rol,
      activo: true,
      telefono: datos.telefono?.trim() || null,
    },
    { method: 'email-password' },
  );

  await ctx.internalAdapter.linkAccount({
    userId: usuario.id,
    providerId: 'credential',
    issuer: createLocalAccountIssuer('credential'),
    accountId: usuario.id,
    password: hash,
  });

  return usuario;
}

/**
 * Reinicio de contrasena por un administrador.
 *
 * Es la via provisional mientras TCI-34 (recuperacion por correo) no exista.
 *
 * Revoca todas las sesiones del usuario: si la contrasena se cambia porque se
 * sospecha que la cuenta estaba comprometida, dejar las sesiones vivas anularia
 * el proposito.
 *
 * **La revocacion no es instantanea.** Mientras dure la cache en cookie, Better
 * Auth valida contra la cookie firmada y no consulta la base, asi que la sesion
 * vieja sigue sirviendo hasta que esa cache expira. Por eso `cookieCache.maxAge`
 * esta en 60 s en auth.config.ts: acota esa ventana a un minuto.
 */
export async function reiniciarContrasena(
  auth: Auth,
  usuarioId: string,
  contrasenaNueva: string,
): Promise<void> {
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(contrasenaNueva);
  await ctx.internalAdapter.updatePassword(usuarioId, hash);
  await ctx.internalAdapter.deleteUserSessions(usuarioId);
}

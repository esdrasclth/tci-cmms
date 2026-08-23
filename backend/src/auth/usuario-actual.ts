import type { UserSession } from '@thallesp/nestjs-better-auth';

import { Rol } from '../generated/prisma/enums';

export interface UsuarioActual {
  id: string;
  rol: Rol;
}

/**
 * Extrae el usuario de la sesion de Better Auth.
 *
 * `rol` es un additionalField (ver auth.config.ts): existe en la fila y viaja
 * en la sesion, pero no esta en el tipo base de UserSession. Ante la duda se
 * asume TECNICO, que es el rol con menos permisos.
 */
export function usuarioActual(session: UserSession): UsuarioActual {
  const user = session.user as UserSession['user'] & { rol?: Rol };
  return { id: user.id, rol: user.rol ?? Rol.TECNICO };
}

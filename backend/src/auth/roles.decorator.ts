import { SetMetadata } from '@nestjs/common';

import type { Rol } from '../generated/prisma/enums';

export const ROLES_KEY = 'tci:roles';

/**
 * Restringe una ruta a ciertos roles (TCI-33).
 *
 * No se usa el `@Roles()` de `@thallesp/nestjs-better-auth`: ese lee un campo
 * `role`, y el del CMMS se llama `rol` (ver auth.config.ts).
 *
 * Esto protege rutas completas. La autorizacion que depende del recurso
 * concreto —por ejemplo "solo el tecnico asignado a ESTA orden"— sigue en los
 * servicios, porque un guard no conoce la orden.
 */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);

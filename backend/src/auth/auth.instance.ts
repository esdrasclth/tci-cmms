import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';
import { createAuth } from './auth.config';

/**
 * Instancia standalone de Better Auth, fuera del contenedor de Nest.
 *
 * Existe para el CLI de Better Auth, que necesita importar un `auth` ya
 * construido para generar/verificar el esquema:
 *
 *   npx @better-auth/cli generate --config src/auth/auth.instance.ts
 *
 * La aplicacion NO usa esta instancia: Nest construye la suya con el
 * PrismaService inyectado (ver src/app.module.ts).
 */
export const auth = createAuth(
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL ?? '',
    }),
  }),
);

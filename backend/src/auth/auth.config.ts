import { prismaAdapter } from '@better-auth/prisma-adapter';
import { betterAuth } from 'better-auth';
import type { PrismaClient } from '../generated/prisma/client';

/**
 * Configuracion de Better Auth — TCI-31 (login y sesion), TCI-32 (roles).
 *
 * La tabla `users` de Better Auth es la tabla de usuarios del sistema: no hay
 * una tabla `Usuario` aparte que haya que mantener sincronizada. Los campos
 * propios del CMMS (rol, activo, telefono) se declaran aqui como
 * additionalFields y deben existir en prisma/schema.prisma.
 */
export function createAuth(prisma: PrismaClient) {
  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),

    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
    basePath: '/api/auth',

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      // Registro publico cerrado: las cuentas las da de alta un administrador
      // (POST /api/usuarios). Esto apaga POST /api/auth/sign-up/email; el alta
      // interna usa el adaptador de Better Auth, ver
      // src/usuarios/crear-usuario-credenciales.ts.
      disableSignUp: true,
      // TCI-34 (recuperacion de contrasena) necesita un servicio de correo.
      // Se conecta en el modulo 8 (Notificaciones); por ahora queda apagado
      // para no dejar un flujo a medias que parezca funcional.
      requireEmailVerification: false,
    },

    user: {
      additionalFields: {
        rol: {
          type: 'string',
          required: false,
          defaultValue: 'TECNICO',
          // Nadie se auto-asigna rol al registrarse: solo un Admin lo cambia
          // desde el panel de gestion de usuarios (TCI-35).
          input: false,
        },
        activo: {
          type: 'boolean',
          required: false,
          defaultValue: true,
          input: false,
        },
        telefono: {
          type: 'string',
          required: false,
          input: true,
        },
      },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 dias
      updateAge: 60 * 60 * 24, // refresca la sesion una vez al dia
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },

    advanced: {
      // El frontend Next.js corre en otro puerto/subdominio (TCI-40).
      defaultCookieAttributes: {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    },

    trustedOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  });
}

export type Auth = ReturnType<typeof createAuth>;

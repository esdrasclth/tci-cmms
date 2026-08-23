import { inferAdditionalFields } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

/**
 * Cliente de Better Auth contra el backend NestJS (TCI-31).
 *
 * El backend corre en otro puerto, asi que las peticiones son cross-origin:
 * `credentials: 'include'` es obligatorio para que viaje la cookie de sesion.
 * El origen del frontend tiene que estar en CORS_ORIGIN del backend.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  basePath: '/api/auth',
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [
    // `rol`, `activo` y `telefono` son additionalFields del backend
    // (backend/src/auth/auth.config.ts); sin esto no llegan tipados.
    //
    // `input: false` tiene que coincidir con el backend: son campos que se leen
    // de la sesion pero que nadie manda al registrarse (si no, cualquiera se
    // daria de alta como ADMIN). Sin esta linea el tipo de signUp los exige.
    inferAdditionalFields({
      user: {
        rol: { type: 'string', input: false },
        activo: { type: 'boolean', input: false },
        telefono: { type: 'string', required: false },
      },
    }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;

export type Rol = 'ADMIN' | 'TECNICO';

import { prismaAdapter } from '@better-auth/prisma-adapter';
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';

import type { CorreoService } from '../correo/correo.service';
import type { PrismaClient } from '../generated/prisma/client';

/**
 * Configuracion de Better Auth — TCI-31 (login y sesion), TCI-32 (roles).
 *
 * La tabla `users` de Better Auth es la tabla de usuarios del sistema: no hay
 * una tabla `Usuario` aparte que haya que mantener sincronizada. Los campos
 * propios del CMMS (rol, activo, telefono) se declaran aqui como
 * additionalFields y deben existir en prisma/schema.prisma.
 */
/**
 * Origenes a los que se les permite hablar con la API.
 *
 * Lo consumen dos sitios y por eso vive aqui: `trustedOrigins` de Better Auth y
 * el CORS que monta main.ts. Si se separaran, un despliegue podria autenticar
 * desde un origen al que el navegador no le deja ni hacer la peticion.
 */
export function origenesConfiados(): string[] {
  return (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * TCI-34 — cuerpo del correo de restablecimiento.
 *
 * HTML plano con estilos en linea, por lo mismo que el resumen preventivo: los
 * clientes de correo descartan el `<style>` del `<head>` y bloquean las
 * imagenes remotas.
 */
function correoDeRestablecimiento(url: string, nombre: string): string {
  return `<div style="font-family:Arial,sans-serif;color:#333;max-width:560px">
    <p style="font-size:18px;font-weight:bold;color:#C61D1A;margin:0">TCI</p>
    <p style="margin:12px 0">Hola ${nombre},</p>
    <p style="margin:12px 0">
      Alguien pidio restablecer la contrasena de su cuenta del CMMS. Si fue
      usted, use este enlace:
    </p>
    <p style="margin:20px 0">
      <a href="${url}" style="background:#C61D1A;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">
        Cambiar mi contrasena
      </a>
    </p>
    <p style="margin:12px 0;font-size:13px;color:#6B7280">
      El enlace caduca en una hora. Si no lo pidio, ignore este mensaje: su
      contrasena no cambia hasta que alguien use el enlace.
    </p>
  </div>`;
}

/**
 * @param correo Servicio de envio. Es opcional porque el seed y algunas
 *   herramientas construyen la instancia de auth sin contenedor de Nest; sin el
 *   solo se apaga el restablecimiento por correo, no el login.
 */
export function createAuth(prisma: PrismaClient, correo?: CorreoService) {
  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),

    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
    basePath: '/api/auth',

    /*
     * Limite de peticiones.
     *
     * Better Auth ya lo activa solo en produccion, con 3 intentos por cada 10
     * segundos en /sign-in. Aqui se endurece en dos puntos:
     *
     * 1. **Se guarda en base y no en memoria.** El almacenamiento por defecto
     *    vive en el proceso, asi que se vaciaba en cada reinicio: bastaba con
     *    esperar a un redespliegue para que el contador volviera a cero.
     *
     * 2. **La ventana del login pasa de 10 segundos a 15 minutos.** El limite
     *    de fabrica frena las rafagas pero no el goteo: 3 cada 10 segundos son
     *    unos mil intentos por hora, que contra un puñado de cuentas conocidas
     *    es tiempo de sobra. Diez cada quince minutos deja trabajar a quien se
     *    equivoca de contraseña y cierra la puerta a probarlas en masa.
     *
     * `enabled` se declara explicito en vez de heredar el valor implicito de
     * NODE_ENV: que una proteccion dependa de una variable de entorno sin
     * decirlo es como se apaga sin que nadie se entere. En desarrollo sigue
     * apagado, o probar el login seria un suplicio.
     */
    rateLimit: {
      enabled: process.env.NODE_ENV === 'production',
      storage: 'database',
      window: 60,
      max: 120,
      customRules: {
        // Los nombres son los de las rutas reales, que se comparan exactas.
        // `/forget-password` es la ruta antigua y aqui no se usa: el cliente
        // llama a `requestPasswordReset` (ver frontend/src/lib/auth-client.ts).
        '/sign-in/email': { window: 900, max: 10 },
        '/request-password-reset': { window: 900, max: 5 },
        '/reset-password': { window: 900, max: 10 },
      },
    },

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      // Registro publico cerrado: las cuentas las da de alta un administrador
      // (POST /api/usuarios). Esto apaga POST /api/auth/sign-up/email; el alta
      // interna usa el adaptador de Better Auth, ver
      // src/usuarios/crear-usuario-credenciales.ts.
      disableSignUp: true,
      requireEmailVerification: false,

      /*
       * TCI-34 — restablecimiento de contrasena.
       *
       * El flujo esta completo; lo que falta es la configuracion de Resend, que
       * depende de que el cliente confirme el dominio con el que firmar los
       * envios. Sin `RESEND_API_KEY`, `CorreoService` registra el intento y
       * devuelve `enviado: false`: el usuario ve el mismo mensaje de siempre
       * —no se le dice si su correo existe— y la salida sigue siendo que un
       * administrador le asigne una contrasena desde el panel.
       *
       * El token lo emite y valida Better Auth. Una hora de vida: suficiente
       * para leer un correo y corto para un enlace que abre una cuenta.
       */
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        if (!correo) return;
        await correo.enviar({
          para: [user.email],
          asunto: 'Restablecer su contrasena del CMMS de TCI',
          html: correoDeRestablecimiento(url, user.name),
        });
      },
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
      // La cache en cookie evita ir a la base en cada peticion, pero mientras
      // dura, Better Auth confia en la cookie firmada y NO ve que la sesion se
      // haya revocado. Eso acota cuanto tarda en surtir efecto un reinicio de
      // contrasena por parte de un administrador (TCI-35), que es justo lo que
      // se hace cuando se sospecha que una cuenta esta comprometida.
      // 60 s es el compromiso: una consulta por minuto y por usuario.
      cookieCache: {
        enabled: true,
        maxAge: 60,
      },
    },

    advanced: {
      // El frontend Next.js corre en otro puerto/subdominio (TCI-40).
      defaultCookieAttributes: {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
    },

    databaseHooks: {
      session: {
        /**
         * TCI-33 — un usuario dado de baja no puede iniciar sesion.
         *
         * `activo` es un campo del CMMS que Better Auth no conoce, asi que no
         * lo comprueba por su cuenta. Cortar aqui, en la creacion de la sesion,
         * es lo unico que impide que alguien desactivado siga entrando con su
         * contrasena de siempre.
         */
        create: {
          before: async (session) => {
            const usuario = await prisma.user.findUnique({
              where: { id: session.userId },
              select: { activo: true },
            });
            if (usuario && !usuario.activo) {
              throw new APIError('FORBIDDEN', {
                message:
                  'Su cuenta esta desactivada. Contacte al administrador.',
                code: 'USUARIO_DESACTIVADO',
              });
            }
          },
        },
      },
    },

    trustedOrigins: origenesConfiados(),
  });
}

export type Auth = ReturnType<typeof createAuth>;

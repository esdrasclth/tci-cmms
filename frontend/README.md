# CMMS TCI — Frontend

Interfaz web del sistema de órdenes de trabajo de TCI.

Stack: **Next.js 16** (App Router) · **React 19** · **Tailwind CSS 4** · **Better Auth** · TypeScript.

## Arranque

```bash
# 1. El backend tiene que estar corriendo primero (ver ../backend/README.md)
#    docker compose up -d postgres && cd ../backend && npm run start:dev

# 2. Variables de entorno
cp .env.example .env.local

# 3. Dependencias y servidor de desarrollo
npm install
npm run dev
```

La app queda en `http://localhost:3000`.

> El origen del frontend debe estar en `CORS_ORIGIN` del backend, o Better Auth
> rechazará las peticiones. Con los valores por defecto (`:3000` y `:3001`) ya coincide.

## Rutas

| Ruta | Qué es |
|---|---|
| `/login` | Inicio de sesión (TCI-40) |
| `/registro` | Alta de cuenta — siempre con rol `TECNICO` |
| `/recuperar-contrasena` | Aviso de que `TCI-34` aún no está disponible |
| `/panel` | Marcador de posición tras iniciar sesión (lo reemplaza `TCI-41`) |

## Diseño

La estructura de las pantallas de autenticación sigue la referencia que aportó el
cliente en `../branding/idea-login.jpg`: fondo a sangre con la marca y el mensaje
a la izquierda, tarjeta blanca con el formulario a la derecha.

Adaptaciones respecto a la referencia, y por qué:

- **Colores de TCI** (`#C61D1A` sobre negro y blanco) en lugar de la paleta azul.
  Los tokens están en `src/app/globals.css`; la tipografía es Arial, la
  institucional, así que no se carga ninguna webfont.
- **Sin "Continuar con Google".** El backend solo tiene habilitado
  correo + contraseña (`emailAndPassword` en `auth.config.ts`); un botón social
  sería un callejón sin salida. Cuando se configure un proveedor OAuth, el hueco
  está justo antes del enlace de registro.
- **Fondo geométrico en vez de fotografía.** No hay banco de imágenes propio y
  una foto de archivo desentonaría con la marca. Las facetas del SVG evocan el
  trazo del logotipo.
- **El logotipo nunca baja de ~40px de alto.** Es blanco y rojo sobre
  transparente, con trazos muy finos: más pequeño se empasta, y sobre fondo claro
  directamente no se ve. Por eso el fondo oscuro se conserva también en móvil.

## Autenticación

`src/lib/auth-client.ts` configura el cliente contra la API. Dos detalles que no
son evidentes:

- Las peticiones son **cross-origin** (`:3000` → `:3001`), así que
  `credentials: 'include'` es obligatorio para que viaje la cookie de sesión.
- `rol`, `activo` y `telefono` son *additionalFields* del backend y hay que
  declararlos con `inferAdditionalFields` para que lleguen tipados. `rol` y
  `activo` van con `input: false`, igual que en el backend: nadie se asigna un
  rol al registrarse.

La guarda de `/panel` es **del lado del cliente**, a propósito: dar por hecho que
la cookie del backend llega al servidor de Next solo funciona mientras ambos
compartan host. Cuando el despliegue fije los dominios (`TCI-70`) puede pasar a
un middleware.

## Pendientes conocidos

- No hay tests. Falta decidir herramienta (Vitest + Testing Library encajaría con
  lo que ya usa el backend).
- `/panel` es un marcador de posición: no consume todavía `GET /api/ordenes`.
- Sin manejo de sesión expirada: si la cookie caduca con la app abierta, la
  siguiente acción falla y hay que recargar.

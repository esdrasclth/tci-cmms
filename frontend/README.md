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
| `/recuperar-contrasena` | Aviso de que `TCI-34` aún no está disponible |
| `/panel` | Listado de órdenes de trabajo (TCI-41) |
| `/panel/ordenes/[id]` | Detalle, transiciones de estado e historial (TCI-42) |

**No hay pantalla de registro.** El backend tiene el registro público cerrado
(`disableSignUp`) y las cuentas las da de alta un administrador con
`POST /api/usuarios`. Falta la pantalla para hacerlo: es `TCI-35`.

## Listado de órdenes (TCI-41)

Es la misma vista para los dos roles y **el filtrado por rol lo hace el backend**:
un técnico recibe solo sus órdenes aunque manipule la petición. En el frontend el
rol solo cambia el título y si se muestra la columna de técnico asignado — nunca
se usa para decidir qué datos ocultar.

Tabla en escritorio y tarjetas en móvil, porque el técnico consulta esto en campo
(`TCI-44`). Filtros por estado, paginación, y estados de carga, error y vacío.

## Detalle de una orden (TCI-42)

Los botones de acción salen de `accionesDisponibles`, que **calcula el backend**
según el estado y el rol (`TCI-78` regla 2). El frontend solo los pinta: no
decide qué transición es válida, ni duplica la máquina de estados. Lo que cada
acción pide (motivo, técnico, datos de cierre) sí está en `CONFIG_ACCION`, pero
solo para armar el formulario — el backend vuelve a validarlo todo.

Tras cada acción se relee la orden completa, así que la vista refleja el estado
real del servidor y no una suposición local.

El historial mezcla en un solo hilo cronológico los cambios de estado, las
asignaciones, las ediciones y los comentarios sueltos
(`POST /api/ordenes/:id/comentarios`).

> **Sobre "en tiempo real" del work item:** la vista se actualiza al instante
> para quien ejecuta la acción, pero **no hay envío desde el servidor**. Si dos
> personas miran la misma orden, una no ve lo que hace la otra hasta recargar.
> Eso necesita WebSocket o SSE y encaja con el módulo de notificaciones
> (`TCI-53`).

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
- **No hay actualización en vivo entre usuarios** (ver el aviso de TCI-42).
- **No se puede crear ni editar una orden desde la interfaz**: el backend tiene
  `POST` y `PATCH /api/ordenes`, pero no hay pantalla para ellos.
- Los filtros del listado no se reflejan en la URL: al recargar se pierden.
- Los tipos de la API están escritos a mano en `src/lib/ordenes.ts`. Si el backend
  cambia el `include` del listado, hay que actualizarlos aquí.
- Sin manejo de sesión expirada: si la cookie caduca con la app abierta, la
  siguiente acción muestra el error pero no lleva al login.

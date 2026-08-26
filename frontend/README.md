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
| `/panel/ordenes/nueva` | Alta de orden (TCI-24) |
| `/panel/ordenes/[id]` | Detalle, transiciones de estado e historial (TCI-42) |
| `/panel/ordenes/[id]/editar` | Edición de la orden — solo admin (TCI-26) |
| `/panel/clientes` | Clientes y sedes — solo admin (TCI-36) |
| `/panel/equipos` | Equipos por cliente — solo admin (TCI-37) |
| `/panel/equipos/[id]` | Ficha del equipo y su historial de órdenes (TCI-38) |
| `/panel/repuestos` | Catálogo de repuestos y almacén — solo admin (TCI-45) |
| `/panel/tipos-mantenimiento` | Catálogo de tipos de mantenimiento — solo admin (TCI-30) |
| `/panel/usuarios` | Gestión de usuarios — solo admin (TCI-35) |

**No hay pantalla de registro.** El backend tiene el registro público cerrado
(`disableSignUp`): las cuentas se dan de alta desde `/panel/usuarios`, que solo
ven los administradores.

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

Cada detalle abre `GET /api/ordenes/:id/eventos`, un stream **SSE** autenticado.
Cuando otro usuario comenta, edita o cambia el estado, recibe
`orden-actualizada` y vuelve a leer la OT. Esto actualiza la vista sin recargar
y conserva las acciones permitidas para la sesión que recibe el evento.

## Historial por equipo (TCI-38)

`/panel/equipos/[id]` no necesitó endpoint nuevo: `GET /api/ordenes?equipoId=`
ya filtraba y, de paso, aplica el aislamiento por rol.

Eso tiene una consecuencia que conviene tener presente: **un técnico ve ahí solo
sus propias órdenes sobre el equipo**, no todas. Es consistente con el resto del
sistema, pero discutible para trabajo de campo — el historial completo de una
máquina es justo lo que ayuda a diagnosticarla. Si TCI quiere abrirlo, es quitar
el filtro por técnico solo para esa consulta, y encaja mejor con `TCI-57`.

A diferencia de `/panel/equipos`, esta pantalla **no exige rol**: a un técnico le
sirve, y se llega a ella desde el campo "Equipo" del detalle de una orden.

## Búsqueda y filtrado (TCI-39)

Clientes filtra por texto (nombre, RTN, contacto) y por estado. Equipos añade
cliente y sede — la sede se limpia al cambiar de cliente, porque dejaría de
pertenecerle.

La búsqueda va **diferida 300 ms** (`useDebounce` en `src/lib/hooks.ts`): sin
eso, cada tecla dispara una petición. Mientras se recarga, la tabla se atenúa en
vez de sustituirse por el esqueleto; el esqueleto queda solo para la primera
carga, cuando aún no hay nada que atenuar.

## Catálogo de tipos de mantenimiento (TCI-30)

El tipo de una orden **no es un enum**: es una fila editable en
`/panel/tipos-mantenimiento`, con código, nombre, color y si exige equipo. Por
eso el formulario de alta de órdenes lee el catálogo de la API
(`src/lib/tipos-mantenimiento.ts`) en vez de traer la lista escrita en código.

Misma distinción que en clientes y equipos, y por el mismo motivo — confundirla
destruye historial:

- **Desactivar** saca el tipo del formulario de alta, pero las órdenes que ya lo
  usan lo conservan.
- **Borrar** solo se ofrece si ninguna orden lo usa. El backend lo rechaza en
  caso contrario, y aquí el botón ya sale deshabilitado con el motivo.

## Repuestos e inventario (TCI-45, TCI-46, TCI-47)

La existencia **no se edita**: se mueve con entradas y salidas, que dejan asiento
en el libro del repuesto. Por eso el diálogo de edición no tiene campo de stock y
en su lugar hay dos acciones por fila. El backend rechaza el campo igualmente,
pero la pantalla no debe ofrecer lo que no se puede hacer.

El consumo por orden (`components/repuestos-orden.tsx`) vive en el detalle,
entre la evidencia y el historial, porque es parte del parte de trabajo: lo que
se hizo y lo que se gastó. El desplegable solo trae lo que el backend considera
imputable —activo y con existencia—, así que no ofrece nada que vaya a devolver
un 422.

Cada cambio avisa al detalle con `onCambio` porque imputar mueve el costo de la
orden, que se muestra en otra tarjeta; sin eso el total quedaría desfasado hasta
recargar.

El aviso de mínimos (`TCI-47`) aparece en dos sitios y a propósito: como banda
sobre el catálogo, donde el administrador puede reponer, y junto a la línea
recién imputada en la orden, que es lo único que el técnico ve.

## Móvil (TCI-44)

El técnico trabaja desde el teléfono, así que el panel entero se revisa a 360 px.
Dos decisiones que se repiten en todas las pantallas:

- **Tabla en escritorio, tarjetas en móvil.** No es una tabla con scroll
  horizontal: son dos vistas del mismo dato. Las celdas se extraen a componentes
  que ambas comparten (`Identidad`, `EtiquetaRol`, `Acciones`…), para que no se
  desincronicen al tocar una sola.
- **La barra lateral se convierte en cajón.** 256 px de navegación permanente no
  dejan sitio para trabajar en 375 px, así que en móvil la barra se abre sobre el
  contenido desde un botón de la cabecera, y se cierra con Escape o tocando
  fuera.

Los diálogos suben desde abajo como hoja (`rounded-t-2xl`, `items-end`) y solo
se centran a partir de `sm:`.

## Navegación

La navegación del panel es una **columna lateral fija** de 256 px
(`src/components/barra-lateral.tsx`). En horizontal, los cinco destinos del
administrador competían con el logotipo por el ancho y había que abreviarlos
("Tipos"); en vertical caben enteros y entra el icono.

El técnico ve un solo destino, "Mis órdenes". Se le deja aunque sea el único:
le da contexto de dónde está y mantiene una sola forma de volver al listado
desde el detalle.

Los iconos (`src/components/iconos.tsx`) son **de trazo, nunca macizos**: 1.75 px
sobre rejilla de 24, heredando `currentColor`. Así un icono pesa lo mismo que la
etiqueta que acompaña. Los de relleno se leen como un segundo nivel de jerarquía
y competirían con el rojo institucional, que es el único acento de color de la
aplicación. Por eso mismo el estado activo marca con una barra roja de 2 px y
**no** con texto rojo: sobre negro el rojo da 3.6:1 y no llegaría a AA.

## Tipografía

**Poppins**, cargada con `next/font` y servida desde el propio origen: no hay
petición a Google en tiempo de ejecución. Solo se piden los pesos 400, 500, 600
y 700.

Dos ajustes en `globals.css` que la familia pide: más interlineado en el texto
corrido (tiene la altura de x muy alta y los renglones se tocaban) y menos
interletrado en los titulares, vía la clase `.tci-display`.

La pila de reserva es **Arial**, la tipografía institucional de TCI: si Poppins
no llega, la aplicación cae en la fuente de la marca y no en una cualquiera.

## Diseño

La estructura de las pantallas de autenticación sigue la referencia que aportó el
cliente en `../branding/idea-login.jpg`: fondo a sangre con la marca y el mensaje
a la izquierda, tarjeta blanca con el formulario a la derecha.

Adaptaciones respecto a la referencia, y por qué:

- **Colores de TCI** (`#C61D1A` sobre negro y blanco) en lugar de la paleta azul.
  Los tokens están en `src/app/globals.css`.
- **Sin "Continuar con Google".** El backend solo tiene habilitado
  correo + contraseña (`emailAndPassword` en `auth.config.ts`); un botón social
  sería un callejón sin salida. Cuando se configure un proveedor OAuth, el hueco
  está justo antes del enlace de registro.
- **Fotografía de la marca** (`public/background.jpg`) bajo una capa negra al
  55 %. La capa no es decorativa: sin ella el texto blanco pierde contraste
  sobre las zonas claras de la foto.
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
- Las listas de clientes, equipos y tipos **no paginan**. Con el volumen actual
  de TCI no hace falta; si crece, la API ya acepta filtros y solo faltaría el
  `page`.
- El historial de un equipo muestra **las 25 más recientes**, sin paginar. Para
  más, se remite al listado general.
- La lista de usuarios no pagina ni filtra desde la interfaz, aunque la API sí
  acepta `rol`, `activo` y `q`. Con el tamaño de equipo de TCI no hace falta
  todavía.
- Los filtros no se reflejan en la URL: al recargar se pierden.
- Los tipos de la API están escritos a mano en `src/lib/ordenes.ts`. Si el backend
  cambia el `include` del listado, hay que actualizarlos aquí.
- Sin manejo de sesión expirada: si la cookie caduca con la app abierta, la
  siguiente acción muestra el error pero no lleva al login.

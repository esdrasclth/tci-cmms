# CMMS TCI — Backend

API del sistema de órdenes de trabajo de TCI (Técnicos de Control Industrial).

Stack: **NestJS 11** · **Prisma 7** · **PostgreSQL 18** · **Better Auth 1.7** · TypeScript · Docker.

## Requisitos

- Node.js **22.22.1 o superior** (`@thallesp/nestjs-better-auth` lo exige en `engines`)
- Docker Desktop

## Arranque

```bash
# 1. Base de datos (desde la raíz del repo)
docker compose up -d postgres

# 2. Variables de entorno
cd backend
cp .env.example .env          # y generar el BETTER_AUTH_SECRET

# 3. Dependencias, cliente de Prisma y migraciones
npm install
npm run db:generate
npm run db:migrate

# 4. Datos mínimos para trabajar (tipos de mantenimiento, clientes, equipos)
npm run db:seed

# 5. Levantar en modo watch
npm run start:dev
```

La API queda en `http://localhost:3001`.

> El Postgres del compose publica el puerto **5436** en el host, no el 5432, para no
> chocar con otros Postgres que ya corren en las máquinas del equipo. Dentro de la red
> de Docker sigue siendo 5432.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run start:dev` | API en modo watch |
| `npm run build` | Compila a `dist/` |
| `npm test` | Tests unitarios (Vitest) |
| `npm run test:e2e` | Tests e2e — **necesita Postgres arriba** |
| `npm run lint` | ESLint con `--fix` |
| `npm run db:migrate` | Crea y aplica una migración en desarrollo |
| `npm run db:deploy` | Aplica migraciones pendientes (producción) |
| `npm run db:generate` | Regenera el cliente de Prisma |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Carga el catálogo y datos de ejemplo (`prisma/seed.ts`) |

## Estructura

```
src/
  auth/
    auth.config.ts      Configuración de Better Auth (TCI-31, TCI-32)
    auth.instance.ts    Instancia standalone, para scripts y tipos del frontend
  ordenes/
    orden-estado.service.ts  Máquina de estados de la OT (TCI-78)
    ordenes.service.ts       Reglas de negocio y persistencia (TCI-23)
    ordenes.controller.ts    Rutas REST
    dto/                     Validación de entrada (class-validator)
  prisma/
    prisma.service.ts   PrismaClient con driver adapter de Postgres
    prisma.module.ts    Módulo global
  generated/prisma/     Cliente generado por Prisma — NO se versiona
  app.module.ts         Wiring: Config + Prisma + Better Auth
  main.ts               Bootstrap
prisma/
  schema.prisma         Modelo de datos (TCI-22)
  migrations/           Historial de migraciones
  seed.ts               Datos mínimos de desarrollo
```

## Órdenes de trabajo (TCI-23)

| Método | Ruta | Quién |
|---|---|---|
| `POST` | `/api/ordenes` | Con sesión |
| `GET` | `/api/ordenes` | Con sesión — el técnico solo ve las suyas |
| `GET` | `/api/ordenes/:id` | Admin, o el técnico asignado |
| `PATCH` | `/api/ordenes/:id` | Admin |
| `DELETE` | `/api/ordenes/:id` | Admin (soft delete) |

**El estado nunca se cambia por `PATCH`.** Cada transición de
[`docs/flujo-ordenes.md`](../docs/flujo-ordenes.md) tiene su propio endpoint:

| Acción | Ruta | Desde | Quién | Body |
|---|---|---|---|---|
| asignar | `POST /api/ordenes/:id/asignar` | `PENDIENTE` | Admin | `{tecnicoId}` |
| reasignar | `POST /api/ordenes/:id/reasignar` | `ASIGNADA` | Admin | `{tecnicoId}` |
| desasignar | `POST /api/ordenes/:id/desasignar` | `ASIGNADA` | Admin | — |
| iniciar | `POST /api/ordenes/:id/iniciar` | `ASIGNADA` | Técnico asignado o Admin | — |
| pausar | `POST /api/ordenes/:id/pausar` | `EN_PROCESO` | Técnico asignado o Admin | `{motivo}` |
| reanudar | `POST /api/ordenes/:id/reanudar` | `EN_ESPERA` | Técnico asignado o Admin | — |
| completar | `POST /api/ordenes/:id/completar` | `EN_PROCESO` | Técnico asignado o Admin | `{trabajoRealizado, horasTrabajadas?, costoManoObra?}` |
| cancelar | `POST /api/ordenes/:id/cancelar` | cualquiera no final | Admin | `{motivo}` |
| reabrir | `POST /api/ordenes/:id/reabrir` | `COMPLETADA` | Admin | `{motivo}` |

Además, `POST /api/ordenes/:id/comentarios` con `{comentario}` agrega una entrada
al historial **sin** cambiar el estado (`TCI-42`). Lo puede usar el admin o el
técnico asignado.

`GET /api/ordenes/:id/eventos` abre un stream **SSE** autenticado para el detalle
de la OT. Tras un comentario, una edición o una transición, el backend emite
`orden-actualizada`; el frontend vuelve a pedir el detalle, en vez de confiar en
datos enviados por el evento.

Una transición fuera de la tabla responde **422**; sin permiso, **403**.
El detalle de una orden incluye `accionesDisponibles`: la lista de acciones que
*este* usuario puede ejecutar ahora. El frontend pinta botones a partir de eso y
nunca decide él la validez (TCI-78 regla 2).

Filtros del listado: `estado`, `prioridad` (ambos admiten lista separada por
comas), `tecnicoId`, `clienteId`, `sedeId`, `equipoId`, `tipoMantenimientoId`,
`q` (número o título), `desde`/`hasta` sobre `fechaProgramada`, más
`page`, `perPage`, `orderBy` y `orden`.

```bash
# Crear (requiere sesión)
curl -b cookies.txt -X POST http://localhost:3001/api/ordenes   -H "Content-Type: application/json"   -d '{"titulo":"Compresor no arranca","descripcionProblema":"No enciende desde ayer",
       "clienteId":"...","equipoId":"...","tipoMantenimientoId":"...","prioridad":"ALTA"}'

# Listar las órdenes en proceso de un técnico
curl -b cookies.txt "http://localhost:3001/api/ordenes?estado=EN_PROCESO&perPage=10"
```

## Clientes, sedes y equipos (TCI-36, TCI-37)

| Método | Ruta | Quién |
|---|---|---|
| `GET` | `/api/clientes` | Con sesión — filtros `q`, `activo`; incluye sedes |
| `GET` | `/api/clientes/:id` | Con sesión |
| `POST` | `/api/clientes` | Admin |
| `PATCH` | `/api/clientes/:id` | Admin — incluye `activo` |
| `DELETE` | `/api/clientes/:id` | Admin |
| `POST` | `/api/clientes/:id/sedes` | Admin |
| `PATCH` `DELETE` | `/api/sedes/:id` | Admin |
| `GET` | `/api/equipos` | Con sesión — filtros `clienteId`, `sedeId`, `q`, `activo` |
| `GET` | `/api/equipos/:id` | Con sesión |
| `POST` | `/api/equipos` | Admin |
| `PATCH` | `/api/equipos/:id` | Admin — incluye `activo` |
| `DELETE` | `/api/equipos/:id` | Admin |

La **lectura queda abierta a cualquier sesión** a propósito: el formulario de
alta de una orden necesita elegir cliente, sede y equipo, y también lo usa un
técnico. La escritura es solo de administradores.

### Desactivar no es borrar

Son dos cosas distintas, y confundirlas destruye historial:

- **`activo = false`** saca al cliente o equipo de los formularios de alta, pero
  conserva todo lo demás. Es lo normal cuando se deja de trabajar con alguien.
- **`DELETE`** es borrado lógico (`deletedAt`) y **se rechaza con 422 si la
  entidad tiene órdenes** — regla 2 de `docs/modelo-datos-orden.md`. Lo mismo
  para una sede con órdenes o equipos asociados.

Al borrar un cliente se marcan también sus sedes: sin cliente no tienen sentido.

### Otras reglas

- El **RTN** es opcional pero único, y se valida a 14 dígitos. El chequeo previo
  existe para dar un mensaje útil en vez del `P2002` opaco de Prisma.
- El **código de equipo** es único en todo el sistema, no por cliente, y se
  normaliza a mayúsculas.
- El **cliente de un equipo no se puede cambiar**: desligaría su historial de
  órdenes. La sede sí, pero debe pertenecer al mismo cliente.

## Catálogo de tipos de mantenimiento (TCI-30)

| Método | Ruta | Quién |
|---|---|---|
| `GET` | `/api/tipos-mantenimiento` | Con sesión — **solo los activos** |
| `GET` | `/api/tipos-mantenimiento/admin` | Admin — todos, con el conteo de órdenes |
| `POST` | `/api/tipos-mantenimiento` | Admin |
| `PATCH` | `/api/tipos-mantenimiento/:id` | Admin — incluye `activo` |
| `DELETE` | `/api/tipos-mantenimiento/:id` | Admin — 422 si alguna orden lo usa |

**Las dos lecturas no son intercambiables.** La primera solo devuelve los activos porque
es la que alimenta el formulario de alta de órdenes: si ofreciera un tipo desactivado, el
alta fallaría con un 422 que el usuario no sabría interpretar. La segunda cuelga de una
subruta fija, y no de un query param, para que no haya forma de pedir los inactivos sin
ser admin.

**Desactivar no es borrar**, igual que en clientes y equipos. `DELETE` es borrado real
(la tabla no tiene `deletedAt`) y se rechaza si alguna orden usa el tipo: forma parte de
su historial y la FK es `Restrict`. Para retirar uno que ya se usó está `activo: false`.

El `codigo` se normaliza a mayúsculas y solo admite letras, números y guion: es la
etiqueta corta que se ve en la tabla de órdenes y también entra en las claves de los
adjuntos, donde un espacio o una tilde estorban.

## Inventario y repuestos (TCI-45, TCI-46, TCI-47)

| Método | Ruta | Quién |
|---|---|---|
| `GET` | `/api/repuestos` | Con sesión — **solo activos y con existencia** |
| `GET` | `/api/repuestos/admin` | Admin — todos, con costo y aviso de mínimos |
| `GET` | `/api/repuestos/alertas` | Admin — los que están en o bajo el mínimo |
| `GET` | `/api/repuestos/:id/movimientos` | Admin — el libro del repuesto |
| `POST` | `/api/repuestos` | Admin |
| `POST` | `/api/repuestos/:id/entradas` | Admin — suma existencia, exige motivo |
| `POST` | `/api/repuestos/:id/salidas` | Admin — resta existencia, exige motivo |
| `PATCH` | `/api/repuestos/:id` | Admin — **sin `stockActual`** |
| `DELETE` | `/api/repuestos/:id` | Admin — 422 si ya se movió o se imputó |
| `GET` | `/api/ordenes/:id/repuestos` | Admin o el técnico asignado |
| `POST` | `/api/ordenes/:id/repuestos` | Admin o el técnico asignado |
| `PATCH` | `/api/ordenes/:id/repuestos/:lineaId` | Admin o el técnico asignado |
| `DELETE` | `/api/ordenes/:id/repuestos/:lineaId` | Admin o el técnico asignado |

**El stock lo escribe un solo método.** `InventarioService.mover()` guarda el asiento del
libro y el saldo del repuesto dentro de la misma transacción, y **recibe** la transacción en
vez de abrirla, porque imputar a una orden mueve almacén e imputa costo y las dos cosas
tienen que caer o confirmarse juntas. Por eso `stockActual` no está en el DTO de edición: si
se pudiera escribir a mano, el libro dejaría de explicar el saldo.

**El costo unitario se congela al imputar.** Cambiar el precio del catálogo no mueve lo que
costó una orden anterior. `costoRepuestos` se recalcula desde las líneas —nunca sumando y
restando— y `costoTotal` se rehace con la mano de obra ya registrada.

**Las rutas de consumo cuelgan de la orden**, igual que las de evidencia (`TCI-43`): el
permiso es el de la orden, y así no hay camino que se salte la comprobación. Una orden
`COMPLETADA` o `CANCELADA` no admite cambios en su consumo, ni de un admin.

**Sobre "alertas de stock bajo" (`TCI-47`):** hoy se consultan, no se envían. Avisan al
**llegar** al mínimo, no solo al bajar de él, y un mínimo de `0` no avisa nunca — que es la
forma de decir que ese repuesto no se controla. El aviso por correo o push necesita el
módulo 8 y va con `TCI-54`.

## Mantenimiento preventivo (TCI-49, TCI-50, TCI-51)

| Método | Ruta | Quién |
|---|---|---|
| `GET` | `/api/tipos-equipo` | Con sesión — solo los activos |
| `GET` | `/api/tipos-equipo/admin` | Admin — todos, con cuántos equipos y planes los usan |
| `POST` `PATCH` `DELETE` | `/api/tipos-equipo…` | Admin |
| `GET` | `/api/planes-mantenimiento` | Admin — con a cuántos equipos alcanza cada uno |
| `GET` | `/api/planes-mantenimiento/:id/equipos` | Admin — a quién alcanza y cuándo le toca |
| `POST` `PATCH` `DELETE` | `/api/planes-mantenimiento…` | Admin |

**Los tipos de equipo pasan a ser un catálogo.** Hasta `TCI-37` el tipo era texto libre en
`Equipo.tipo`. Un plan colgado de ese campo se rompe en silencio con un plural o una tilde, y
los equipos sin tipo no reciben plan sin que nadie se entere. La migración
`preventivo_planes` crea una fila por cada valor distinto que ya existía —normalizando
espacios y mayúsculas— y enlaza cada equipo con la suya; los que no tenían tipo se quedan sin
enlazar a propósito. El campo de texto sigue en la tabla con lo que se escribió antes, pero
ya no manda.

**El vencimiento se cuenta desde el último cierre real**, no desde un calendario fijo: si el
preventivo de marzo se hizo el 10 de abril, el siguiente cuenta desde el 10 de abril. Así el
plan refleja el estado de la máquina y no acumula órdenes atrasadas cuando el equipo se
retrasa. Decisión del cliente del 2026-08-26. Un equipo **sin preventivo previo cuenta como
vencido**: es la primera vez que se le aplica.

**La frecuencia se guarda como valor + unidad**, no como número de días: "cada 3 meses" no
son 90 días, y convertirlo al guardar desplazaría la fecha unos días cada trimestre.
`sumarFrecuencia` suma meses como meses y recorta al último día válido (31 de enero + 1 mes =
28 de febrero).

`tipoEquipoId` no está en el DTO de edición del plan: cambiarlo lo convertiría en otro plan y
dejaría colgadas las órdenes que ya generó.

### Generación automática (TCI-50)

| Método | Ruta | Quién |
|---|---|---|
| `POST` | `/api/planes-mantenimiento/generar` | Admin — pasada de todos los planes |
| `POST` | `/api/planes-mantenimiento/:id/generar` | Admin — pasada de un plan |

Corre sola a las **6:00** (`PREVENTIVO_CRON` lo cambia; `PREVENTIVO_AUTOMATICO=false` lo
apaga) y crea una orden `PREVENTIVO_AUTOMATICO` por cada equipo vencido, con la fecha
programada del vencimiento —no la de hoy— para que el atraso quede a la vista.

Tres cosas la hacen segura de repetir:

1. **No duplica.** Si el equipo ya tiene una orden abierta de ese plan, se omite. Sin esta
   regla un plan vencido crearía una orden cada día hasta que alguien la cerrara.
2. **Un solo proceso a la vez.** La pasada entera corre en una transacción que toma
   `pg_try_advisory_xact_lock`. El lock es **de transacción y no de sesión** a propósito:
   Prisma reparte las consultas por un pool, así que un `pg_advisory_lock` puede tomarse en
   una conexión y soltarse en otra, quedar retenido para siempre y dejar el generador mudo.
   Eso pasó de verdad durante el desarrollo y lo destapó un e2e.
3. **Todo o nada.** Como corre en una transacción, no queda media pasada aplicada. Reintentar
   es seguro por la regla 1.

Las órdenes automáticas se atribuyen a un **usuario de sistema**
(`USUARIO_SISTEMA_EMAIL`, por defecto `sistema@tci.local`), creado la primera vez que hace
falta y **sin fila en `accounts`**: no tiene contraseña que verificar, así que no hay forma de
iniciar sesión con él. Además va con `activo: false`, de modo que el guard de `TCI-33` lo
rechazaría aunque alguien le fabricara credenciales.

### Calendario (TCI-51)

`GET /api/planes-mantenimiento/calendario?desde&hasta` (admin). Los dos límites son
obligatorios: sin `hasta`, la proyección de un plan diario no terminaría nunca.

Mezcla dos cosas que en la pantalla se parecen pero no lo son:

- **`ORDEN`** — ya generada por un plan (`TCI-50`). Es un hecho: tiene número y se puede
  abrir.
- **`PROYECCION`** — cuándo le tocará a un equipo según su plan, todavía sin orden. Es una
  previsión y cambia si el mantenimiento se adelanta o se atrasa, porque el vencimiento se
  cuenta desde el último cierre real.

Un calendario que solo mostrara órdenes estaría casi vacío —solo se generan al vencer— y no
serviría para planificar, que es justo para lo que se mira. La ocurrencia que ya tiene orden
abierta se omite de las proyecciones para que no salga dos veces.

Un plan mensual marca **todos los meses del rango**, no solo el primero; el tope es
`MAX_OCURRENCIAS` (24) por equipo y plan. `vencido` se decide **por día y no por instante**:
una orden generada esta mañana para hoy no está vencida aunque su hora ya haya pasado.

## Reportes e historial (TCI-57, TCI-58, TCI-59, TCI-60)

| Método | Ruta | Quién |
|---|---|---|
| `GET` | `/api/equipos/:id/historial` | Con sesión — **el historial completo del equipo** |
| `GET` | `/api/reportes/resumen` | Admin — tablero de indicadores |
| `GET` | `/api/reportes/tecnicos` | Admin — carga y desempeño por técnico |
| `GET` | `/api/reportes/ordenes?formato=csv\|pdf` | Admin — exportación |

**El historial del equipo no aplica el aislamiento por técnico, y es deliberado.** En el
resto del sistema un técnico solo ve sus propias órdenes (regla 3 de `TCI-25`); aquí no,
porque el historial completo de una máquina es lo que permite diagnosticarla y ocultarle las
intervenciones ajenas solo le hace repetir el trabajo. Decisión del cliente del 2026-08-26.
Vive en endpoint propio y no relajando `GET /ordenes?equipoId=`, que conserva la regla
intacta, y su proyección se acota: sin costos ni datos de contacto.

**El periodo se mide sobre `createdAt` y en hora del negocio.** Un reporte de agosto contiene
lo que entró en agosto, y `hasta` incluye el día completo. El desfase es
`REPORTES_UTC_OFFSET` (por defecto `-6`, Honduras, que no aplica horario de verano): sin
eso, en un contenedor en UTC "hasta el 31" dejaría fuera todo lo creado después de las 18:00
del 31 en San Pedro Sula.

**Sobre las medias:** `diasPromedioResolucion` va de `createdAt` a `fechaFin` sobre las
órdenes completadas — al cliente le importa cuánto tardó desde que lo reportó, no cuánto
estuvo el técnico con las manos encima. Eso último está en `horasTrabajadas`.

El **CSV** va con `;` y con BOM, las dos cosas por Excel: en un Windows en español el
separador de lista es `;` y sin BOM las tildes salen rotas. El **PDF** (pdfkit) es apaisado
y lleva membrete tipográfico, no el logotipo: el de TCI es blanco sobre transparente y
desaparecería en el papel.

## Usuarios (TCI-35)

| Método | Ruta | Quién |
|---|---|---|
| `POST` | `/api/usuarios` | Admin — alta con rol, correo y contraseña |
| `GET` | `/api/usuarios` | Admin — filtros `rol`, `activo`, `q` |
| `PATCH` | `/api/usuarios/:id` | Admin — nombre, rol, teléfono y baja lógica (`activo`) |
| `POST` | `/api/usuarios/:id/contrasena` | Admin — reinicio de contraseña |

Dos guardas impiden que el sistema se quede sin quien lo administre, porque no
habría forma de arreglarlo desde la propia aplicación: un administrador **no
puede quitarse su propio rol ni desactivarse**, y **no se puede degradar ni dar
de baja al último administrador activo**.

El correo no se puede cambiar: identifica la cuenta en Better Auth y tocarlo por
fuera dejaría la fila de `accounts` desalineada.

**Sobre el reinicio de contraseña:** revoca las sesiones del usuario, pero la
revocación **no es instantánea**. Mientras dure la caché en cookie, Better Auth
valida contra la cookie firmada sin consultar la base. Por eso
`session.cookieCache.maxAge` está en **60 s**: acota esa ventana a un minuto,
medido y verificado. Subirlo vuelve a alargar el tiempo que una sesión revocada
sigue sirviendo.

El alta reutiliza las piezas internas de Better Auth (`password.hash`,
`internalAdapter.createUser`, `internalAdapter.linkAccount`) en lugar de escribir
las filas a mano: ver `src/usuarios/crear-usuario-credenciales.ts`. Hacerlo con
Prisma directamente funcionaría hoy y se rompería en cuanto Better Auth cambiara
el formato del hash o la forma de la cuenta.

Todavía **no hay pantalla** para esto en el frontend: eso es el resto de `TCI-35`.

### Correlativo

`numero` es `OT-{año}-{NNNN}`, único y con secuencia por año. Se genera dentro de
la transacción del alta, protegido con `pg_advisory_xact_lock`, y **no se
reutiliza** aunque la orden se borre lógicamente.

## Autorización (TCI-33)

Dos capas, cada una donde puede decidir:

- **`RolesGuard` global** (`src/auth/roles.guard.ts`) — corta a los usuarios
  desactivados y aplica `@Roles(...)` a nivel de ruta.
- **Los servicios** — todo lo que depende del recurso concreto, como "solo el
  técnico asignado a *esta* orden". Un guard no conoce la orden, así que esto no
  puede subir.

`@Roles()` es propio (`src/auth/roles.decorator.ts`): el de
`@thallesp/nestjs-better-auth` lee un campo `role` y el nuestro se llama `rol`.

**Usuarios dados de baja.** `activo` es un campo del CMMS que Better Auth no
conoce, así que hay dos cortes: un hook `databaseHooks.session.create.before`
impide que obtengan una sesión nueva (el login responde **403
`USUARIO_DESACTIVADO`**), y el guard rechaza las peticiones de una sesión que ya
estuviera abierta. Lo segundo tarda hasta 60 s por la caché en cookie —
verificado.

## Autenticación

Better Auth queda montado en `/api/auth/*`. El `AuthModule` registra un **AuthGuard global**:
toda ruta exige sesión salvo que se marque con `@Public()`.

```bash
# Registrar usuario
curl -X POST http://localhost:3001/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tci.hn","password":"Password123","name":"Admin TCI"}'

# Iniciar sesión (guarda la cookie de sesión)
curl -c cookies.txt -X POST http://localhost:3001/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tci.hn","password":"Password123"}'

# Ruta protegida
curl -b cookies.txt http://localhost:3001/api/me
```

La tabla `users` de Better Auth **es** la tabla de usuarios del sistema: no hay una tabla
`Usuario` aparte. El rol (`ADMIN` / `TECNICO`) es un campo de esa tabla y no se puede
asignar al registrarse — solo lo cambia un Admin (TCI-35).

### Decoradores disponibles

`@Public()` · `@Optional()` · `@Session()` · `@Roles()` — de `@thallesp/nestjs-better-auth`.

## Notas técnicas

- **Vitest, no Jest.** Better Auth y sus dependencias son ESM-only y usan `import.meta`,
  que no se puede transpilar a CommonJS; Jest revienta al importarlas.
- **Prisma 7 requiere driver adapter.** La conexión va por `@prisma/adapter-pg`, no por
  un motor de consultas propio.
- **`bodyParser: false` en `main.ts`** es obligatorio: el `AuthModule` aplica su propio
  body parser a todo salvo `/api/auth/*`, donde Better Auth necesita el stream crudo.
- **CORS** se configura solo, a partir de `trustedOrigins` en `auth.config.ts`
  (que lee `CORS_ORIGIN`).

## Adjuntos (TCI-43)

La evidencia vive en **MinIO** (compatible con S3), en un bucket **privado**. El backend es
el único que habla con MinIO: el archivo entra por `POST /api/ordenes/:id/adjuntos`
(multipart, campo `archivo`) y sale por `GET /api/ordenes/:id/adjuntos/:adjuntoId`, que es
donde se comprueba si quien pregunta es el admin o el técnico asignado.

- **No se confía en el `Content-Type` del navegador.** Se comprueban los primeros bytes
  (`src/adjuntos/tipos-permitidos.ts`): un HTML renombrado a `.png` se rechaza con 422. Sin
  eso, servir adjuntos desde el origen de la API sería un XSS almacenado. Los PDF se
  entregan como `attachment` y nunca en línea.
- **Las claves agrupan por orden**, para poder navegar el bucket a mano:
  `ordenes/{año}/{numero}/{tipo}/{id}-{nombre}`.
- **El frontend no puede pintar `<img src={urlDeLaApi}>`**: la cookie es `SameSite=Lax` y no
  viaja en subrecursos hacia otro origen. Las miniaturas bajan su blob con `fetch` y usan un
  object URL (`frontend/src/components/evidencia-orden.tsx`).
- **multer entrega el nombre del archivo decodificado como latin1.** `Compresión.png` llega
  como `CompresiÃ³n.png`; lo recompone `src/adjuntos/nombre-original.ts`.
- **El nombre no puede ir crudo en una cabecera HTTP.** MinIO responde 400 ante un byte no
  ASCII en `Content-Disposition`; se codifica según RFC 5987 (`src/adjuntos/disposicion.ts`).

## Tests

| Comando | Qué corre |
|---|---|
| `npm test` | Unitarios. No tocan la base; la máquina de estados (`orden-estado.service.spec.ts`) se prueba aquí porque es un servicio puro. |
| `npm run test:e2e` | De punta a punta sobre HTTP **contra Postgres real**. Requiere `docker compose up -d postgres` desde la raíz. |

Los e2e corren contra la **misma base que el desarrollo**, así que no vacían nada:
`test/utils/escenario.ts` siembra usuarios, cliente, sede, equipo y tipos con un sufijo
único por ejecución y al terminar borra exactamente los ids que creó. Si se agrega un
test que cree órdenes por fuera del helper `crearOrden`, hay que pasarlas por
`esc.registrarOrden(id)` o quedarán huérfanas en la base.

`test/utils/app-e2e.ts` levanta el `AppModule` replicando el arranque de `main.ts`
(incluido el `ValidationPipe`). **Cualquier cambio en el bootstrap de `main.ts` hay que
replicarlo ahí**, o los tests de validación dejarían de probar lo que corre en producción.

Las sesiones se obtienen iniciando sesión de verdad contra `/api/auth/sign-in/email`:
no se simula el guard, así que los 401/403 que verifican los tests son los mismos que
devolvería la API en producción.

## Pendientes conocidos

- `TCI-34` recuperación de contraseña: necesita servicio de correo (módulo 8).
- `EVIDENCIA_OBLIGATORIA` está en `false` por decisión del 2026-08-25, no por falta de
  soporte: la carga de evidencia (`TCI-43`) ya funciona, pero todavía no bloquea el cierre.
  Encenderla es cambiar la variable.
- El inventario **no reserva** existencia: se descuenta al imputar, no al planificar. Con el
  volumen de TCI no hace falta, pero la generación automática de órdenes preventivas
  (`TCI-50`) va a querer saber si habrá repuesto el día programado.

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

### Correlativo

`numero` es `OT-{año}-{NNNN}`, único y con secuencia por año. Se genera dentro de
la transacción del alta, protegido con `pg_advisory_xact_lock`, y **no se
reutiliza** aunque la orden se borre lógicamente.

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

## Pendientes conocidos

- `TCI-34` recuperación de contraseña: necesita servicio de correo (módulo 8).
- **No hay guard de roles** (`TCI-33`): la autorización admin/técnico se resuelve
  en `OrdenesService` y `OrdenEstadoService`, que conocen la orden concreta. Falta
  el `@Roles()` a nivel de ruta.
- **No hay tests e2e de órdenes**: la máquina de estados está cubierta por tests
  unitarios (`orden-estado.service.spec.ts`), pero el controller solo se verificó
  a mano contra la base real.
- `EVIDENCIA_OBLIGATORIA` está en `false` hasta que exista la carga de adjuntos
  (`TCI-43`).
- `Repuesto` / `OrdenRepuesto` (módulo 6) y `PlanMantenimiento` (módulo 7) todavía no
  están en el schema; se agregan en su módulo.
- El catálogo de tipos de mantenimiento vive en el seed; falta su CRUD real (`TCI-30`).
- Los clientes, sedes y equipos también salen del seed: sus CRUD son `TCI-36` y `TCI-37`.

# Contribuir a TCI CMMS

El proyecto está bajo [AGPL v3](LICENSE): puedes usarlo, estudiarlo y
modificarlo, y lo que aportes aquí se publica con esa misma licencia.

---

## Entorno

Requisitos: **Node 20+** y **Docker**.

```bash
cp .env.example .env
docker compose up -d postgres          # PostgreSQL 18 en el 5436

cd backend
npm install && cp .env.example .env
npx prisma migrate deploy
SEED_ADMIN_EMAIL=admin@ejemplo.com SEED_ADMIN_PASSWORD=... npm run db:seed
npm run start:dev                      # API en http://localhost:3001/api

cd ../frontend && npm install && npm run dev   # panel en http://localhost:3000
```

**El seed no es opcional.** El registro público está cerrado (`disableSignUp` en
`auth.config.ts`), así que sin él una instalación nueva se queda sin ninguna
cuenta con la que entrar. Es idempotente: se puede correr las veces que haga
falta.

**Comprueba a qué base apuntas antes de migrar o sembrar.** Prisma lee
`backend/.env` y su valor gana sobre lo que exportes en la terminal:

```bash
cd backend && npx prisma migrate status   # imprime host y base
```

---

## Cómo está hecho

- **Dos aplicaciones separadas.** El panel de Next.js no habla con la base:
  todo pasa por la API de NestJS. Si necesitas un dato nuevo en una pantalla,
  el sitio donde se resuelve es un endpoint, no un cliente de Prisma en el
  frontend.
- **La sesión la lleva Better Auth**, con roles `ADMIN` y `TECNICO`. El alta de
  usuarios es cosa de un administrador.
- **La orden de trabajo es la entidad central.** Tiene FK no nulas a cliente y
  a tipo de mantenimiento, y su historial (`orden_historial`) es append-only:
  los cambios de estado se registran, no se sobrescriben. Ese rastro es la razón
  de ser del sistema — si algo lo rompe, no es un detalle.
- **La evidencia va a S3**, nunca a la base. En la tabla queda la clave, y la
  URL se firma al leer.
- **El preventivo genera órdenes solo.** `planes_mantenimiento` define la
  frecuencia y el proceso crea las órdenes con antelación; ojo al tocarlo,
  porque un error ahí no falla, simplemente deja de programar mantenimientos.
- **Nombres de tabla en `snake_case` y en español** (`ordenes_trabajo`,
  `planes_mantenimiento`, `movimientos_inventario`), igual que el vocabulario
  del negocio.

---

## Antes del pull request

```bash
cd backend
npx prisma generate
npm run lint
npm run test          # Vitest, no Jest: Better Auth es ESM-only
npm run build

cd ../frontend
npm run lint
npm run build
```

Si cambiaste el esquema, añade la migración (`npx prisma migrate dev`) y súbela
con el cambio. Nada de `prisma db push` fuera de tu base local, y antes de tocar
producción: `scripts/respaldo.sh`.

---

## Estilo

- **Español** en comentarios, nombres de dominio, mensajes de interfaz y de
  commit: `orden`, `equipo`, `sede`, `repuesto`, `preventivo`.
- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `docs:`.
- Comenta el **porqué**, no el qué.

---

## Pull requests

1. Rama descriptiva: `feat/checklist-firma`, `fix/calendario-preventivo`.
2. Un pull request, un tema.
3. En la descripción: qué problema resuelve y cómo lo probaste.
4. **Nunca subas datos de clientes reales**: ni volcados de base, ni capturas
   con órdenes o equipos de verdad. Las imágenes de este repositorio salen de
   una instancia local con datos inventados.

---

## Seguridad

Una vulnerabilidad no se reporta en un issue público. Escribe a
<Esdras.Clother@outlook.com> con los pasos para reproducirla.

# syntax=docker/dockerfile:1

# --- Etapa 1: dependencias + build ------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Despues del COPY: prisma generate necesita ver el tsconfig.json para emitir
# los imports del cliente con la extension correcta.
RUN npx prisma generate
RUN npm run build

# Deja solo dependencias de produccion para copiarlas a la imagen final
RUN npm prune --omit=dev

# --- Etapa 2: runtime -------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# No correr como root
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/package.json ./
# El seed (TCI-62) corre con tsx sobre prisma/seed.ts, que importa de ../src.
# Sin esto `npm run db:seed` falla dentro del contenedor, y como el registro
# publico esta cerrado no habria forma de crear el primer administrador.
COPY --from=builder /app/src ./src

USER nestjs
EXPOSE 3001

# `npx` resuelve el CLI local: `prisma` es dependencia de produccion a proposito.
# Si estuviera en devDependencies el `npm prune` de arriba se lo llevaria y npx
# intentaria bajarlo de la red en cada arranque, como el usuario nestjs y sin
# cache escribible.
# Las migraciones se aplican al arrancar: en Dokploy no hay un paso previo de
# despliegue donde correrlas (TCI-61, TCI-69).
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]

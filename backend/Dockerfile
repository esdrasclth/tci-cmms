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

USER nestjs
EXPOSE 3001

# Las migraciones se aplican al arrancar: en Dokploy no hay un paso previo de
# despliegue donde correrlas (TCI-61, TCI-69).
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]

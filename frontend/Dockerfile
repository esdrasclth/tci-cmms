# syntax=docker/dockerfile:1

# --- Etapa 1: dependencias --------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

# --- Etapa 2: build ---------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `NEXT_PUBLIC_*` se resuelve EN LA COMPILACION, no al arrancar: Next lo incrusta
# en el paquete que descarga el navegador. Por eso entra como build arg y no
# como variable del contenedor — ponerla solo en `environment` daria una imagen
# que apunta a localhost pase lo que pase.
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# La URL publica del propio sitio, para `metadataBase`. Va en la COMPILACION
# aunque no sea `NEXT_PUBLIC_*`: las paginas estaticas —el login entre ellas—
# generan su HTML aqui dentro, con sus metadatos ya resueltos. Pasarla solo al
# arrancar la deja fuera de ese HTML, y `og:image` sale apuntando a localhost.
ARG SITE_URL=http://localhost:3000
ENV SITE_URL=$SITE_URL

# Sin telemetria: es una compilacion desatendida en un servidor ajeno.
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# --- Etapa 3: runtime -------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# No correr como root.
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# `standalone` trae el servidor y sus dependencias, pero no los estaticos ni
# `public`: hay que copiarlos aparte o la aplicacion carga sin estilos ni logo.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]

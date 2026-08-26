#!/usr/bin/env bash
#
# TCI-71 — volcado de la base de produccion.
#
# Se ejecuta desde la raiz del proyecto, contra el compose de produccion. Deja
# el archivo comprimido en ./respaldos y borra los mas viejos que RETENCION_DIAS.
#
#   ./scripts/respaldo.sh
#
# Para que corra solo, en el crontab del host:
#   30 2 * * * cd /ruta/al/proyecto && ./scripts/respaldo.sh >> respaldos/respaldo.log 2>&1
#
# A las 2:30, antes de que el generador preventivo escriba a las 6:00.

set -euo pipefail

COMPOSE="${COMPOSE_FILE:-docker-compose.prod.yml}"
DESTINO="${DESTINO_RESPALDOS:-./respaldos}"
RETENCION_DIAS="${RETENCION_DIAS:-30}"

mkdir -p "$DESTINO"

# El usuario y la base salen del entorno del contenedor y no de variables del
# host: asi el script no puede volcar una base distinta de la que corre.
USUARIO=$(docker compose -f "$COMPOSE" exec -T postgres printenv POSTGRES_USER | tr -d '\r')
BASE=$(docker compose -f "$COMPOSE" exec -T postgres printenv POSTGRES_DB | tr -d '\r')

SELLO=$(date +%Y%m%d-%H%M%S)
ARCHIVO="$DESTINO/tci_cmms-$SELLO.sql.gz"

echo "[$(date -Iseconds)] Volcando $BASE..."

# `pg_dump -Fc` daria un formato mas flexible, pero SQL plano comprimido se
# puede inspeccionar con zcat sin herramientas de Postgres, que es lo que hace
# falta cuando algo salio mal y no se sabe que.
docker compose -f "$COMPOSE" exec -T postgres \
  pg_dump -U "$USUARIO" -d "$BASE" --clean --if-exists \
  | gzip -9 > "$ARCHIVO"

# Un volcado vacio o truncado pesa unos cientos de bytes. Fallar aqui es mejor
# que descubrirlo el dia que haga falta restaurar.
TAMANO=$(wc -c < "$ARCHIVO")
if [ "$TAMANO" -lt 1024 ]; then
  echo "ERROR: el volcado pesa $TAMANO bytes. Algo fallo." >&2
  rm -f "$ARCHIVO"
  exit 1
fi

echo "[$(date -Iseconds)] Listo: $ARCHIVO ($(du -h "$ARCHIVO" | cut -f1))"

BORRADOS=$(find "$DESTINO" -name 'tci_cmms-*.sql.gz' -mtime "+$RETENCION_DIAS" -print -delete | wc -l)
if [ "$BORRADOS" -gt 0 ]; then
  echo "[$(date -Iseconds)] Retirados $BORRADOS respaldo(s) de mas de $RETENCION_DIAS dias."
fi

echo
echo "AVISO: este respaldo esta en el mismo servidor que la base. Eso no protege"
echo "del caso que mas importa, que es perder el servidor. Copielo fuera."

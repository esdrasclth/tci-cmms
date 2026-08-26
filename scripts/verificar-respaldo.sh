#!/usr/bin/env bash
#
# TCI-71 — comprueba que un respaldo restaura de verdad.
#
# Un volcado que existe no es un respaldo: lo es cuando se ha restaurado alguna
# vez. Este script lo restaura en una base temporal, cuenta las filas de las
# tablas que importan y la borra.
#
#   ./scripts/verificar-respaldo.sh                  # el mas reciente
#   ./scripts/verificar-respaldo.sh respaldos/x.gz   # uno concreto
#
# No toca la base de produccion en ningun momento.

set -euo pipefail

COMPOSE="${COMPOSE_FILE:-docker-compose.prod.yml}"
DESTINO="${DESTINO_RESPALDOS:-./respaldos}"

ARCHIVO="${1:-$(ls -1t "$DESTINO"/tci_cmms-*.sql.gz 2>/dev/null | head -1 || true)}"
if [ -z "$ARCHIVO" ] || [ ! -f "$ARCHIVO" ]; then
  echo "ERROR: no hay ningun respaldo que verificar en $DESTINO." >&2
  exit 1
fi

USUARIO=$(docker compose -f "$COMPOSE" exec -T postgres printenv POSTGRES_USER | tr -d '\r')
TEMPORAL="verificacion_$(date +%s)"

echo "Verificando $ARCHIVO"
echo "Restaurando en la base temporal $TEMPORAL..."

limpiar() {
  docker compose -f "$COMPOSE" exec -T postgres \
    psql -U "$USUARIO" -d postgres -c "DROP DATABASE IF EXISTS $TEMPORAL;" >/dev/null 2>&1 || true
}
trap limpiar EXIT

docker compose -f "$COMPOSE" exec -T postgres \
  psql -U "$USUARIO" -d postgres -c "CREATE DATABASE $TEMPORAL;" >/dev/null

# `ON_ERROR_STOP` es lo que convierte esto en una verificacion: sin el, psql
# ignora los errores y termina con exito sobre un volcado roto.
gunzip -c "$ARCHIVO" | docker compose -f "$COMPOSE" exec -T postgres \
  psql -U "$USUARIO" -d "$TEMPORAL" -v ON_ERROR_STOP=1 --quiet >/dev/null

echo
echo "Restaurado. Contenido:"
docker compose -f "$COMPOSE" exec -T postgres psql -U "$USUARIO" -d "$TEMPORAL" -c "
SELECT 'usuarios' AS tabla, count(*) FROM users
UNION ALL SELECT 'clientes', count(*) FROM clientes
UNION ALL SELECT 'equipos', count(*) FROM equipos
UNION ALL SELECT 'ordenes', count(*) FROM ordenes_trabajo
UNION ALL SELECT 'repuestos', count(*) FROM repuestos
UNION ALL SELECT 'planes', count(*) FROM planes_mantenimiento
ORDER BY 1;"

# Sin un administrador activo no se puede entrar al sistema restaurado, y un
# respaldo al que no se puede entrar no sirve de nada.
ADMINS=$(docker compose -f "$COMPOSE" exec -T postgres \
  psql -U "$USUARIO" -d "$TEMPORAL" -t -A -c \
  "SELECT count(*) FROM users WHERE rol='ADMIN' AND activo=true" | tr -d '\r')

echo
if [ "$ADMINS" -eq 0 ]; then
  echo "ERROR: el respaldo no tiene ningun administrador activo." >&2
  exit 1
fi

echo "OK: el respaldo restaura y tiene $ADMINS administrador(es) activo(s)."

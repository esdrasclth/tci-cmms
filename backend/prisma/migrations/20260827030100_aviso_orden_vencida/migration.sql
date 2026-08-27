-- Preferencias y plantilla del aviso de vencimiento.
--
-- Separado de la migracion anterior porque usa 'ORDEN_VENCIDA', y PostgreSQL
-- no deja usar un valor de enumeracion en la misma transaccion que lo crea.

INSERT INTO "preferencias_notificacion" ("id", "evento", "rol", "canal", "activo", "created_at", "updated_at")
SELECT
  gen_random_uuid()::text,
  d.evento::"EventoNotificable",
  d.rol::"Rol",
  c.canal::"CanalNotificacion",
  c.canal = 'EN_APP',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (VALUES
  ('ORDEN_VENCIDA', 'ADMIN'),
  ('ORDEN_VENCIDA', 'TECNICO')
) AS d(evento, rol)
CROSS JOIN (VALUES ('EN_APP'), ('CORREO')) AS c(canal);

INSERT INTO "plantillas_notificacion" ("id", "evento", "asunto", "cuerpo", "created_at", "updated_at")
VALUES
  ('plantilla_ORDEN_VENCIDA', 'ORDEN_VENCIDA',
   'La orden {{numero}} paso su fecha limite',
   'La orden {{numero}} — {{titulo}}, de {{cliente}}, vencio el {{limite}} y sigue {{estado}}. Lleva {{dias}} de retraso.',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

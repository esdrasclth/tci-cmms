-- CreateEnum
CREATE TYPE "EventoNotificable" AS ENUM ('ORDEN_ASIGNADA', 'ORDEN_COMPLETADA', 'ORDEN_CANCELADA', 'ORDEN_REABIERTA', 'ORDEN_COMENTADA', 'PREVENTIVO_POR_VENCER', 'REPUESTO_BAJO_MINIMO');

-- CreateEnum
CREATE TYPE "CanalNotificacion" AS ENUM ('EN_APP', 'CORREO');

-- CreateTable
CREATE TABLE "preferencias_notificacion" (
    "id" TEXT NOT NULL,
    "evento" "EventoNotificable" NOT NULL,
    "rol" "Rol" NOT NULL,
    "canal" "CanalNotificacion" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preferencias_notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantillas_notificacion" (
    "id" TEXT NOT NULL,
    "evento" "EventoNotificable" NOT NULL,
    "asunto" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantillas_notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "evento" "EventoNotificable" NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "enlace" TEXT,
    "leida_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "preferencias_notificacion_evento_rol_canal_key" ON "preferencias_notificacion"("evento", "rol", "canal");

-- CreateIndex
CREATE UNIQUE INDEX "plantillas_notificacion_evento_key" ON "plantillas_notificacion"("evento");

-- CreateIndex
CREATE INDEX "notificaciones_usuario_id_leida_en_idx" ON "notificaciones"("usuario_id", "leida_en");

-- CreateIndex
CREATE INDEX "notificaciones_usuario_id_created_at_idx" ON "notificaciones"("usuario_id", "created_at");

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Valores por defecto.
--
-- Sin esto el modulo arranca sin notificar nada y parece roto. Las preferencias
-- salen de la regla 9 de docs/flujo-ordenes.md: asignar -> al tecnico,
-- completar -> al admin, cancelar -> al tecnico, reabrir -> al tecnico. Los dos
-- eventos de almacen y preventivo son cosa de la gerencia.
--
-- EN_APP entra activo: funciona hoy. CORREO entra desactivado, porque el envio
-- depende de que el cliente confirme el dominio de TCI (ver la entrada de
-- Intake). El dia que se configure Resend, se encienden desde la pantalla sin
-- tocar codigo ni base.
-- ---------------------------------------------------------------------------

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
  ('ORDEN_ASIGNADA',        'TECNICO'),
  ('ORDEN_COMPLETADA',      'ADMIN'),
  ('ORDEN_CANCELADA',       'TECNICO'),
  ('ORDEN_REABIERTA',       'TECNICO'),
  ('ORDEN_COMENTADA',       'TECNICO'),
  ('ORDEN_COMENTADA',       'ADMIN'),
  ('PREVENTIVO_POR_VENCER', 'ADMIN'),
  ('REPUESTO_BAJO_MINIMO',  'ADMIN')
) AS d(evento, rol)
CROSS JOIN (VALUES ('EN_APP'), ('CORREO')) AS c(canal);

-- ---------------------------------------------------------------------------
-- Plantillas. El id es el nombre del evento: es estable y se lee.
-- Los marcadores `{{campo}}` los sustituye NotificacionesService.
-- ---------------------------------------------------------------------------

INSERT INTO "plantillas_notificacion" ("id", "evento", "asunto", "cuerpo", "created_at", "updated_at")
VALUES
  ('plantilla_ORDEN_ASIGNADA', 'ORDEN_ASIGNADA',
   'Le asignaron la orden {{numero}}',
   'Se le asignó la orden {{numero}} — {{titulo}}, de {{cliente}}. Equipo: {{equipo}}.',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  ('plantilla_ORDEN_COMPLETADA', 'ORDEN_COMPLETADA',
   'La orden {{numero}} quedó completada',
   '{{tecnico}} completó la orden {{numero}} — {{titulo}}, de {{cliente}}.',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  ('plantilla_ORDEN_CANCELADA', 'ORDEN_CANCELADA',
   'Se canceló la orden {{numero}}',
   'La orden {{numero}} — {{titulo}} se canceló. Motivo: {{motivo}}.',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  ('plantilla_ORDEN_REABIERTA', 'ORDEN_REABIERTA',
   'Se reabrió la orden {{numero}}',
   'La orden {{numero}} — {{titulo}} volvió a abrirse y sigue a su nombre.',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  ('plantilla_ORDEN_COMENTADA', 'ORDEN_COMENTADA',
   'Nuevo comentario en la orden {{numero}}',
   '{{autor}} comentó en la orden {{numero}} — {{titulo}}: «{{comentario}}»',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  ('plantilla_PREVENTIVO_POR_VENCER', 'PREVENTIVO_POR_VENCER',
   'Mantenimiento preventivo por atender',
   'El equipo {{equipo}} de {{cliente}} necesita el mantenimiento del plan {{plan}}: {{cuando}}.',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

  ('plantilla_REPUESTO_BAJO_MINIMO', 'REPUESTO_BAJO_MINIMO',
   'El repuesto {{repuesto}} llegó al mínimo',
   'Quedan {{existencia}} {{unidad}} de {{repuesto}} y el mínimo es {{minimo}}.',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- CreateEnum
CREATE TYPE "UnidadFrecuencia" AS ENUM ('DIAS', 'SEMANAS', 'MESES');

-- AlterTable
ALTER TABLE "equipos" ADD COLUMN     "tipo_equipo_id" TEXT;

-- AlterTable
ALTER TABLE "ordenes_trabajo" ADD COLUMN     "plan_id" TEXT;

-- CreateTable
CREATE TABLE "tipos_equipo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planes_mantenimiento" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo_equipo_id" TEXT NOT NULL,
    "cliente_id" TEXT,
    "tipo_mantenimiento_id" TEXT NOT NULL,
    "frecuencia_valor" INTEGER NOT NULL,
    "frecuencia_unidad" "UnidadFrecuencia" NOT NULL,
    "dias_anticipacion" INTEGER NOT NULL DEFAULT 7,
    "prioridad" "Prioridad" NOT NULL DEFAULT 'MEDIA',
    "instrucciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planes_mantenimiento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipos_equipo_nombre_key" ON "tipos_equipo"("nombre");

-- CreateIndex
CREATE INDEX "planes_mantenimiento_activo_idx" ON "planes_mantenimiento"("activo");

-- CreateIndex
CREATE INDEX "planes_mantenimiento_tipo_equipo_id_idx" ON "planes_mantenimiento"("tipo_equipo_id");

-- CreateIndex
CREATE INDEX "equipos_tipo_equipo_id_idx" ON "equipos"("tipo_equipo_id");

-- CreateIndex
CREATE INDEX "ordenes_trabajo_plan_id_idx" ON "ordenes_trabajo"("plan_id");

-- AddForeignKey
ALTER TABLE "equipos" ADD CONSTRAINT "equipos_tipo_equipo_id_fkey" FOREIGN KEY ("tipo_equipo_id") REFERENCES "tipos_equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordenes_trabajo" ADD CONSTRAINT "ordenes_trabajo_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "planes_mantenimiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_mantenimiento" ADD CONSTRAINT "planes_mantenimiento_tipo_equipo_id_fkey" FOREIGN KEY ("tipo_equipo_id") REFERENCES "tipos_equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_mantenimiento" ADD CONSTRAINT "planes_mantenimiento_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planes_mantenimiento" ADD CONSTRAINT "planes_mantenimiento_tipo_mantenimiento_id_fkey" FOREIGN KEY ("tipo_mantenimiento_id") REFERENCES "tipos_mantenimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Migracion de datos: el texto libre de `equipos.tipo` pasa al catalogo.
--
-- Hasta TCI-37 el tipo era un campo de texto. Se crea una fila de catalogo por
-- cada valor distinto que ya exista y se enlaza cada equipo con la suya. Los
-- equipos sin tipo se quedan sin enlazar a proposito: inventarse un tipo para
-- ellos seria peor que dejarlo vacio, y la pantalla de equipos pedira elegirlo.
--
-- La comparacion normaliza espacios y mayusculas para no crear "Compresor" y
-- "compresor " como dos tipos distintos. Se conserva la primera grafia vista.
-- ---------------------------------------------------------------------------

INSERT INTO "tipos_equipo" ("id", "nombre", "activo", "created_at", "updated_at")
SELECT
  gen_random_uuid()::text,
  MIN(TRIM("tipo")),
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "equipos"
WHERE "tipo" IS NOT NULL AND TRIM("tipo") <> ''
GROUP BY LOWER(TRIM("tipo"));

UPDATE "equipos" e
SET "tipo_equipo_id" = t."id"
FROM "tipos_equipo" t
WHERE e."tipo" IS NOT NULL
  AND LOWER(TRIM(e."tipo")) = LOWER(TRIM(t."nombre"));

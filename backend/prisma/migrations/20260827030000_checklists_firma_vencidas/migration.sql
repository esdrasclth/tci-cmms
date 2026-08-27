-- Valores de enumeracion nuevos.
--
-- Van SOLOS en esta migracion: PostgreSQL permite anadir un valor dentro de
-- una transaccion, pero no usarlo hasta que esa transaccion termina, y Prisma
-- envuelve cada migracion en una. Las filas que los usan van en la siguiente.

-- AlterEnum
ALTER TYPE "TipoAdjunto" ADD VALUE 'FIRMA';

-- AlterEnum
ALTER TYPE "EventoNotificable" ADD VALUE 'ORDEN_VENCIDA';

-- CreateTable
CREATE TABLE "items_checklist" (
    "id" TEXT NOT NULL,
    "tipo_mantenimiento_id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_orden" (
    "id" TEXT NOT NULL,
    "orden_id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "hecho" BOOLEAN NOT NULL DEFAULT false,
    "nota" TEXT,
    "marcado_por_id" TEXT,
    "marcado_en" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_orden_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "items_checklist_tipo_mantenimiento_id_orden_idx" ON "items_checklist"("tipo_mantenimiento_id", "orden");

-- CreateIndex
CREATE INDEX "checklist_orden_orden_id_orden_idx" ON "checklist_orden"("orden_id", "orden");

-- AddForeignKey
ALTER TABLE "items_checklist" ADD CONSTRAINT "items_checklist_tipo_mantenimiento_id_fkey" FOREIGN KEY ("tipo_mantenimiento_id") REFERENCES "tipos_mantenimiento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_orden" ADD CONSTRAINT "checklist_orden_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ordenes_trabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_orden" ADD CONSTRAINT "checklist_orden_marcado_por_id_fkey" FOREIGN KEY ("marcado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

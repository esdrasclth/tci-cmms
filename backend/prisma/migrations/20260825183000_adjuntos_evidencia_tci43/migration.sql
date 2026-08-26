-- TCI-43 — carga de evidencia en las ordenes de trabajo.

-- Subir y eliminar evidencia queda en el historial de la orden (TCI-29).
-- Importa sobre todo el borrado: al eliminar un adjunto desaparece su fila y
-- sin este asiento no quedaria rastro de que la evidencia existio.
ALTER TYPE "TipoHistorial" ADD VALUE 'ADJUNTO';

-- `url` pasa a `clave`: el bucket de MinIO es privado y lo que se guarda es la
-- clave del objeto, no una URL que alguien pueda abrir. La tabla esta vacia
-- (los adjuntos no existian hasta ahora), asi que el rename no arrastra datos.
ALTER TABLE "orden_adjuntos" RENAME COLUMN "url" TO "clave";

-- Dos adjuntos no pueden apuntar al mismo objeto: si pasara, borrar uno
-- dejaria al otro sin archivo.
CREATE UNIQUE INDEX "orden_adjuntos_clave_key" ON "orden_adjuntos"("clave");

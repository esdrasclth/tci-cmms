import { Global, Module } from '@nestjs/common';

import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';

/**
 * Modulo 8 — notificaciones (TCI-53 a TCI-56).
 *
 * Global por lo mismo que el correo: lo emiten sitios que no se conocen entre
 * si —ordenes, preventivo, inventario— y no tiene sentido que cada uno lo
 * importe.
 */
@Global()
@Module({
  controllers: [NotificacionesController],
  providers: [NotificacionesService],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}

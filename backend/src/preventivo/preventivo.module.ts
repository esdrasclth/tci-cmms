import { Module } from '@nestjs/common';

import { OrdenesModule } from '../ordenes/ordenes.module';
import { GeneradorPreventivoService } from './generador.service';
import { PreventivoController } from './preventivo.controller';
import { PreventivoService } from './preventivo.service';

/**
 * Modulo 7 — mantenimiento preventivo (TCI-49, TCI-50).
 *
 * Importa OrdenesModule porque el generador crea ordenes por el mismo camino
 * que el alta manual: el correlativo y el asiento inicial del historial se
 * escriben en un solo sitio.
 */
@Module({
  imports: [OrdenesModule],
  controllers: [PreventivoController],
  providers: [PreventivoService, GeneradorPreventivoService],
  exports: [PreventivoService],
})
export class PreventivoModule {}

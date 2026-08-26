import { Module } from '@nestjs/common';

import { PreventivoController } from './preventivo.controller';
import { PreventivoService } from './preventivo.service';

/**
 * Modulo 7 — mantenimiento preventivo (TCI-49).
 *
 * `PreventivoService` se exporta porque la generacion automatica de ordenes
 * (TCI-50) leera de aqui que equipos tienen el preventivo vencido.
 */
@Module({
  controllers: [PreventivoController],
  providers: [PreventivoService],
  exports: [PreventivoService],
})
export class PreventivoModule {}

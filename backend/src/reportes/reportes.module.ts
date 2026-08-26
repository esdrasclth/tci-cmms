import { Module } from '@nestjs/common';

import { ExportacionService } from './exportacion.service';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';

/** Modulo 9 — reportes e historial (TCI-58, TCI-59, TCI-60). */
@Module({
  controllers: [ReportesController],
  providers: [ReportesService, ExportacionService],
})
export class ReportesModule {}

import { Module } from '@nestjs/common';

import { EquiposController } from './equipos.controller';
import { EquiposService } from './equipos.service';
import { HistorialEquipoService } from './historial-equipo.service';

@Module({
  controllers: [EquiposController],
  providers: [EquiposService, HistorialEquipoService],
})
export class EquiposModule {}

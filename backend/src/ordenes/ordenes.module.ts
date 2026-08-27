import { Module } from '@nestjs/common';

import { OrdenEstadoService } from './orden-estado.service';
import { OrdenesController } from './ordenes.controller';
import { OrdenesEventosService } from './ordenes-eventos.service';
import { OrdenesService } from './ordenes.service';
import { OrdenesVencidasService } from './vencidas.service';

@Module({
  controllers: [OrdenesController],
  providers: [
    OrdenesService,
    OrdenEstadoService,
    OrdenesEventosService,
    OrdenesVencidasService,
  ],
  // OrdenEstadoService lo necesitaran el panel de tecnicos (TCI-42) y la
  // generacion automatica de ordenes preventivas (TCI-50).
  exports: [OrdenesService, OrdenEstadoService],
})
export class OrdenesModule {}

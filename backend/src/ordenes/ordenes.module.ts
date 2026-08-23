import { Module } from '@nestjs/common';

import { OrdenEstadoService } from './orden-estado.service';
import { OrdenesController } from './ordenes.controller';
import { OrdenesService } from './ordenes.service';

@Module({
  controllers: [OrdenesController],
  providers: [OrdenesService, OrdenEstadoService],
  // OrdenEstadoService lo necesitaran el panel de tecnicos (TCI-42) y la
  // generacion automatica de ordenes preventivas (TCI-50).
  exports: [OrdenesService, OrdenEstadoService],
})
export class OrdenesModule {}

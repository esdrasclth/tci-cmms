import { Module } from '@nestjs/common';

import { CatalogosController } from './catalogos.controller';
import { CatalogosService } from './catalogos.service';
import { TiposEquipoController } from './tipos-equipo.controller';
import { TiposEquipoService } from './tipos-equipo.service';

@Module({
  controllers: [CatalogosController, TiposEquipoController],
  providers: [CatalogosService, TiposEquipoService],
})
export class CatalogosModule {}

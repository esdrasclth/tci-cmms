import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AdjuntosController } from './adjuntos.controller';
import { AdjuntosService } from './adjuntos.service';
import { AlmacenamientoService } from './almacenamiento.service';

/** TCI-43 — carga de evidencia sobre las ordenes de trabajo. */
@Module({
  imports: [PrismaModule],
  controllers: [AdjuntosController],
  providers: [AdjuntosService, AlmacenamientoService],
  exports: [AdjuntosService],
})
export class AdjuntosModule {}

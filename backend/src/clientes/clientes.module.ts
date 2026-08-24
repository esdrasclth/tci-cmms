import { Module } from '@nestjs/common';

import { ClientesController, SedesController } from './clientes.controller';
import { ClientesService } from './clientes.service';

@Module({
  controllers: [ClientesController, SedesController],
  providers: [ClientesService],
})
export class ClientesModule {}

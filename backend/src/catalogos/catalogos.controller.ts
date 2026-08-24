import { Controller, Get, Param } from '@nestjs/common';

import { CatalogosService } from './catalogos.service';

/**
 * Catalogos de solo lectura para los formularios (TCI-30/36/37, parcial).
 * El AuthGuard global ya exige sesion.
 */
@Controller()
export class CatalogosController {
  constructor(private readonly catalogos: CatalogosService) {}

  @Get('tipos-mantenimiento')
  tiposMantenimiento() {
    return this.catalogos.tiposMantenimiento();
  }

  @Get('clientes')
  clientes() {
    return this.catalogos.clientes();
  }

  @Get('clientes/:id/equipos')
  equipos(@Param('id') id: string) {
    return this.catalogos.equiposDeCliente(id);
  }
}

import { Controller, Get } from '@nestjs/common';

import { CatalogosService } from './catalogos.service';

/**
 * Catalogo de tipos de mantenimiento, de solo lectura (TCI-30, parcial).
 *
 * Clientes y equipos tenian aqui su lectura provisional; desde TCI-36 y TCI-37
 * viven en sus propios modulos, con escritura.
 *
 * El AuthGuard global ya exige sesion. No pide rol: cualquiera que pueda crear
 * una orden necesita leer el catalogo.
 */
@Controller()
export class CatalogosController {
  constructor(private readonly catalogos: CatalogosService) {}

  @Get('tipos-mantenimiento')
  tiposMantenimiento() {
    return this.catalogos.tiposMantenimiento();
  }
}

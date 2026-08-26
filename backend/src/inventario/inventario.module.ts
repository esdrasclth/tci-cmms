import { Module } from '@nestjs/common';

import { ConsumoController } from './consumo.controller';
import { ConsumoService } from './consumo.service';
import { InventarioService } from './inventario.service';
import { RepuestosController } from './repuestos.controller';

/**
 * Modulo 6 — Inventario y repuestos (TCI-45, TCI-46, TCI-47).
 *
 * `InventarioService` se exporta porque la generacion automatica de ordenes
 * preventivas (TCI-50) tendra que reservar repuestos, y el unico camino
 * legitimo para tocar existencias es `mover()`.
 */
@Module({
  controllers: [RepuestosController, ConsumoController],
  providers: [InventarioService, ConsumoService],
  exports: [InventarioService],
})
export class InventarioModule {}

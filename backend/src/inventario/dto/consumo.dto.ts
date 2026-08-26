import { Type } from 'class-transformer';
import { IsNumber, IsString, Max, Min } from 'class-validator';

/**
 * TCI-46 — repuestos consumidos en una orden de trabajo.
 *
 * Imputar es acumulativo: si el repuesto ya esta en la orden, la cantidad se
 * suma a la linea existente en vez de crear una segunda. El detalle de cada
 * imputacion queda en el libro de movimientos.
 */
export class ImputarRepuestoDto {
  @IsString()
  repuestoId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(9_999_999)
  cantidad!: number;
}

/**
 * Corrige la cantidad de una linea ya imputada. Es un valor absoluto, no un
 * incremento: el almacen devuelve o retira la diferencia contra el catalogo.
 */
export class CorregirConsumoDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(9_999_999)
  cantidad!: number;
}

import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

/**
 * TCI-45 — catalogo de repuestos.
 *
 * El `codigo` sigue el mismo criterio que el de los tipos de mantenimiento
 * (TCI-30): mayusculas, sin espacios ni tildes. Es lo que el almacen escribe a
 * mano en la estanteria y lo que se busca en la pantalla.
 */
export class CrearRepuestoDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Length(2, 20)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'El codigo solo admite letras, numeros y guion.',
  })
  codigo!: string;

  @IsString()
  @Length(3, 120)
  nombre!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  descripcion?: string;

  /** Unidad, litro, metro, kilo... Es texto libre corto, no un enum. */
  @IsString()
  @Length(1, 12)
  unidadMedida!: string;

  /**
   * Existencia con la que entra el repuesto al catalogo. No genera asiento en
   * el libro: es el punto de partida, no un movimiento.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(9_999_999)
  stockActual?: number;

  /** TCI-47: por debajo de este nivel el repuesto entra en los avisos. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(9_999_999)
  stockMinimo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999)
  costoUnitario?: number;
}

/** `activo` es la baja: el repuesto deja de ofrecerse sin perder su historial. */
export class ActualizarRepuestoDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsString()
  @Length(2, 20)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'El codigo solo admite letras, numeros y guion.',
  })
  codigo?: string;

  @IsOptional()
  @IsString()
  @Length(3, 120)
  nombre?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @Length(1, 12)
  unidadMedida?: string;

  /**
   * `stockActual` no esta aqui a proposito: se mueve con entradas y salidas,
   * que dejan asiento. Editarlo a mano dejaria el libro sin explicar el saldo.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(9_999_999)
  stockMinimo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999)
  costoUnitario?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class FiltrarRepuestosDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  @IsBoolean()
  activo?: boolean;

  /** Deja solo los que estan en o por debajo del minimo (TCI-47). */
  @IsOptional()
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  @IsBoolean()
  bajoMinimo?: boolean;
}

/**
 * Entrada o salida de almacen registrada a mano: una compra que llega, una
 * merma, una correccion de recuento. El consumo de una orden no pasa por aqui
 * (ver TCI-46), porque ademas de mover stock tiene que imputar costo.
 */
export class RegistrarMovimientoDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(9_999_999)
  cantidad!: number;

  /**
   * Obligatorio: un movimiento sin explicacion vuelve inutil el libro cuando
   * dentro de seis meses alguien pregunte por que faltan diez rodamientos.
   */
  @IsString()
  @Length(3, 200)
  motivo!: string;
}

/** Paginacion del libro de movimientos de un repuesto. */
export class FiltrarMovimientosDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limite?: number;
}

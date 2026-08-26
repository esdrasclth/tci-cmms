import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * Modulo 9 — reportes e historial (TCI-58, TCI-59, TCI-60).
 *
 * El periodo se mide sobre `createdAt` de la orden y no sobre
 * `fechaProgramada`: un reporte de agosto debe contener lo que entro en agosto,
 * aunque se hubiera programado para septiembre. El filtro del listado (TCI-25)
 * usa el otro criterio porque ahi la pregunta es distinta —"que tengo que hacer
 * esta semana"— y por eso no se reutiliza aquel DTO.
 */
export class PeriodoDto {
  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  clienteId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tecnicoId?: string;
}

/** Exportacion (TCI-59). El formato viaja como query param, no en el Accept. */
export class ExportarDto extends PeriodoDto {
  @IsOptional()
  @IsIn(['csv', 'pdf'])
  formato: 'csv' | 'pdf' = 'csv';

  /**
   * Tope de filas del archivo. Existe para que una exportacion sin filtros no
   * intente materializar la tabla entera en memoria.
   */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => Number(value))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  limite: number = 2000;
}

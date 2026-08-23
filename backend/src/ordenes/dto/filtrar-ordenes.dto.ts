import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

import { OrdenEstado, Prioridad } from '../../generated/prisma/enums';

export const CAMPOS_ORDENABLES = [
  'createdAt',
  'fechaProgramada',
  'fechaLimite',
  'numero',
] as const;

/** TCI-25 — filtros del listado. Todo opcional; sin filtros devuelve la pagina 1. */
export class FiltrarOrdenesDto {
  /** Acepta `?estado=PENDIENTE&estado=ASIGNADA` o `?estado=PENDIENTE,ASIGNADA`. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  @IsEnum(OrdenEstado, { each: true })
  estado?: OrdenEstado[];

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  @IsEnum(Prioridad, { each: true })
  prioridad?: Prioridad[];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tecnicoId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  clienteId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sedeId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  equipoId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tipoMantenimientoId?: string;

  /** Busqueda por numero o titulo. */
  @IsOptional()
  @IsString()
  q?: string;

  /** Rango sobre `fechaProgramada`. */
  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  perPage: number = 20;

  @IsOptional()
  @IsIn(CAMPOS_ORDENABLES)
  orderBy: (typeof CAMPOS_ORDENABLES)[number] = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  orden: 'asc' | 'desc' = 'desc';
}

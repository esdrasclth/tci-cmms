import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

import { Prioridad, UnidadFrecuencia } from '../../generated/prisma/enums';

/**
 * TCI-49 — planes de mantenimiento preventivo.
 *
 * Un plan dice "todo equipo de este tipo lleva este mantenimiento cada N
 * unidades de tiempo". La frecuencia se guarda como valor + unidad y no como un
 * numero de dias: "cada 3 meses" no son 90 dias, y convertirlo al guardar
 * perderia la intencion y desplazaria la fecha unos dias cada trimestre.
 */
export class CrearPlanDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(3, 120)
  nombre!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  descripcion?: string;

  @IsString()
  @IsNotEmpty()
  tipoEquipoId!: string;

  /** Acota el plan a un cliente. Sin esto aplica a todos. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  clienteId?: string;

  @IsString()
  @IsNotEmpty()
  tipoMantenimientoId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  frecuenciaValor!: number;

  @IsEnum(UnidadFrecuencia)
  frecuenciaUnidad!: UnidadFrecuencia;

  /** Cuantos dias antes del vencimiento se avisa (TCI-52). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(90)
  diasAnticipacion?: number;

  @IsOptional()
  @IsEnum(Prioridad)
  prioridad?: Prioridad;

  /** Se copia a la descripcion de la orden que genere el plan (TCI-50). */
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  instrucciones?: string;
}

export class ActualizarPlanDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @Length(3, 120)
  nombre?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  descripcion?: string;

  /**
   * `tipoEquipoId` no esta: cambiarlo convertiria el plan en otro distinto y
   * dejaria colgadas las ordenes que ya genero. Para eso se crea uno nuevo.
   */
  @IsOptional()
  @IsString()
  clienteId?: string | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tipoMantenimientoId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  frecuenciaValor?: number;

  @IsOptional()
  @IsEnum(UnidadFrecuencia)
  frecuenciaUnidad?: UnidadFrecuencia;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(90)
  diasAnticipacion?: number;

  @IsOptional()
  @IsEnum(Prioridad)
  prioridad?: Prioridad;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  instrucciones?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class FiltrarPlanesDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tipoEquipoId?: string;
}

/**
 * TCI-51 — rango del calendario.
 *
 * Los dos limites son obligatorios: sin ellos la proyeccion no sabe hasta
 * cuando repetir, y "todo el futuro" de un plan diario no termina nunca.
 */
export class PeriodoCalendarioDto {
  @IsDateString()
  desde!: string;

  @IsDateString()
  hasta!: string;
}

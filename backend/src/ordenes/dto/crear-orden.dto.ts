import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

import { Prioridad } from '../../generated/prisma/enums';

/**
 * TCI-24 — alta de orden.
 *
 * Deliberadamente NO acepta `estado`, `tecnicoId`, `origen` ni los campos de
 * costo:
 * - `estado` y `tecnicoId` solo cambian por los endpoints de accion (TCI-78
 *   regla 1, y TCI-28 para la asignacion). Una orden nace PENDIENTE.
 * - `origen` lo fija el sistema: MANUAL aqui, PREVENTIVO_AUTOMATICO en TCI-50.
 * - los costos los recalcula el consumo de repuestos (TCI-46).
 */
export class CrearOrdenDto {
  @IsString()
  @Length(3, 120)
  titulo!: string;

  @IsString()
  @MinLength(5)
  descripcionProblema!: string;

  @IsString()
  @IsNotEmpty()
  clienteId!: string;

  @IsString()
  @IsNotEmpty()
  tipoMantenimientoId!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sedeId?: string;

  /** Obligatorio si el tipo de mantenimiento tiene `requiereEquipo`. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  equipoId?: string;

  @IsOptional()
  @IsEnum(Prioridad)
  prioridad?: Prioridad;

  @IsOptional()
  @IsDateString()
  fechaProgramada?: string;

  @IsOptional()
  @IsDateString()
  fechaLimite?: string;
}

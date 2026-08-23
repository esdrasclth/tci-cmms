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
 * TCI-26 — edicion de una orden.
 *
 * Solo campos descriptivos y de planificacion. Fuera, a proposito:
 * - `estado` y `tecnicoId`: van por endpoints de accion (TCI-78 regla 1).
 * - `clienteId`: mover una orden de cliente invalidaria su historial y su
 *   correlativo; si el cliente estaba mal, se cancela y se crea otra.
 * - `trabajoRealizado`: se captura al completar (TCI-27).
 * - costos: los recalcula TCI-46.
 */
export class ActualizarOrdenDto {
  @IsOptional()
  @IsString()
  @Length(3, 120)
  titulo?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  descripcionProblema?: string;

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

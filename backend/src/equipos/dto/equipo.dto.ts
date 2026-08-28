import {
  Transform,
  Type,
} from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

import { TextoBorrable } from '../../comun/validacion';

/** TCI-37 — alta de equipo. */
export class CrearEquipoDto {
  /** Codigo interno de TCI, unico en todo el sistema. */
  @IsString()
  @Length(2, 40)
  codigo!: string;

  @IsString()
  @Length(2, 160)
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  clienteId!: string;

  /** Si viene, tiene que ser una sede del mismo cliente. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sedeId?: string;

  @TextoBorrable(2, 80)
  tipo?: string;

  /** TCI-49: el tipo del catalogo. Sustituye al texto libre de arriba. */
  @IsOptional()
  @IsString()
  tipoEquipoId?: string | null;

  @TextoBorrable(1, 80)
  marca?: string;

  @TextoBorrable(1, 80)
  modelo?: string;

  @TextoBorrable(1, 80)
  numeroSerie?: string;

  @TextoBorrable(2, 160)
  ubicacionFisica?: string;
}

/** El cliente no se puede cambiar: el equipo pertenece a quien lo tiene. */
export class ActualizarEquipoDto {
  @IsOptional()
  @IsString()
  @Length(2, 40)
  codigo?: string;

  @IsOptional()
  @IsString()
  @Length(2, 160)
  nombre?: string;

  @IsOptional()
  @IsString()
  sedeId?: string;

  @TextoBorrable(2, 80)
  tipo?: string;

  /** TCI-49: el tipo del catalogo. Sustituye al texto libre de arriba. */
  @IsOptional()
  @IsString()
  tipoEquipoId?: string | null;

  @TextoBorrable(1, 80)
  marca?: string;

  @TextoBorrable(1, 80)
  modelo?: string;

  @TextoBorrable(1, 80)
  numeroSerie?: string;

  @TextoBorrable(2, 160)
  ubicacionFisica?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class FiltrarEquiposDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  clienteId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sedeId?: string;

  /** Busqueda por codigo, nombre, marca, modelo o numero de serie. */
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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage: number = 20;

}

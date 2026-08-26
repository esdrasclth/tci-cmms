import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

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

  @IsOptional()
  @IsString()
  @Length(2, 80)
  tipo?: string;

  /** TCI-49: el tipo del catalogo. Sustituye al texto libre de arriba. */
  @IsOptional()
  @IsString()
  tipoEquipoId?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  marca?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  modelo?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  numeroSerie?: string;

  @IsOptional()
  @IsString()
  @Length(2, 160)
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

  @IsOptional()
  @IsString()
  @Length(2, 80)
  tipo?: string;

  /** TCI-49: el tipo del catalogo. Sustituye al texto libre de arriba. */
  @IsOptional()
  @IsString()
  tipoEquipoId?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  marca?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  modelo?: string;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  numeroSerie?: string;

  @IsOptional()
  @IsString()
  @Length(2, 160)
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
}

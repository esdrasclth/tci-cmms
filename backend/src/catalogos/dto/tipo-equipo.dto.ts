import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

/**
 * TCI-49 — catalogo de tipos de equipo.
 *
 * A diferencia del de tipos de mantenimiento, este no tiene codigo: no se
 * muestra abreviado en ninguna tabla y su nombre ya es la etiqueta. Lo unico
 * que se exige es que no se repita, porque un plan preventivo apunta aqui y dos
 * "Compresor" partirian el plan en dos.
 */
export class CrearTipoEquipoDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(2, 60)
  nombre!: string;
}

export class ActualizarTipoEquipoDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @Length(2, 60)
  nombre?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class FiltrarTiposEquipoDto {
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

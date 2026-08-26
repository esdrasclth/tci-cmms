import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

/** TCI-54 y TCI-55: lo unico editable de una preferencia es si esta activa. */
export class CambiarPreferenciaDto {
  @IsBoolean()
  activo!: boolean;
}

/**
 * TCI-56. El evento no se cambia: la plantilla existe por y para su evento, y
 * moverla dejaria otro sin texto.
 */
export class CambiarPlantillaDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @Length(3, 200)
  asunto?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @Length(3, 2000)
  cuerpo?: string;
}

export class FiltrarBandejaDto {
  @IsOptional()
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  @IsBoolean()
  soloNoLeidas?: boolean;
}

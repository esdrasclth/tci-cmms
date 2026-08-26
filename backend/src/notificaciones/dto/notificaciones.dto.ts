import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

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

/**
 * La bandeja pagina porque `notificaciones` **solo crece**: cada evento anade
 * una fila por destinatario y nada las borra. Es la unica tabla del sistema sin
 * techo natural —los clientes y los equipos los acota el negocio—, asi que es la
 * unica lista que lo necesitaba de verdad.
 */
export class FiltrarBandejaDto {
  @IsOptional()
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  @IsBoolean()
  soloNoLeidas?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  /**
   * Por defecto 20 y no 50: es lo que cabe en el desplegable de la campana sin
   * traerse medio historial en cada sondeo.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage: number = 20;
}

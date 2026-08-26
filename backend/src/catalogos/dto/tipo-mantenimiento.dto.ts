import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

/**
 * TCI-30 — catalogo de tipos de mantenimiento.
 *
 * El `codigo` es la etiqueta corta que se ve en la tabla de ordenes (PREV,
 * CORR, INST...). Se normaliza a mayusculas y se limita a letras, numeros y
 * guion: entra en la interfaz en espacios estrechos y en las claves de los
 * adjuntos, donde un espacio o una tilde estorban.
 */
export class CrearTipoMantenimientoDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Length(2, 12)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'El codigo solo admite letras, numeros y guion.',
  })
  codigo!: string;

  @IsString()
  @Length(3, 80)
  nombre!: string;

  /** Color de la etiqueta, en hexadecimal. */
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'El color debe ser hexadecimal, por ejemplo #C61D1A.',
  })
  color?: string;

  /**
   * Si esta activo, una orden de este tipo no se puede crear sin equipo
   * (regla 3 de docs/modelo-datos-orden.md).
   */
  @IsOptional()
  @IsBoolean()
  requiereEquipo?: boolean;
}

/** `activo` es la baja: el tipo deja de ofrecerse sin perder su historial. */
export class ActualizarTipoMantenimientoDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsString()
  @Length(2, 12)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'El codigo solo admite letras, numeros y guion.',
  })
  codigo?: string;

  @IsOptional()
  @IsString()
  @Length(3, 80)
  nombre?: string;

  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'El color debe ser hexadecimal, por ejemplo #C61D1A.',
  })
  color?: string;

  @IsOptional()
  @IsBoolean()
  requiereEquipo?: boolean;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

/** Filtros del listado de administracion. */
export class FiltrarTiposDto {
  @IsOptional()
  @IsString()
  q?: string;

  /**
   * Por defecto el listado de administracion los trae todos, activos e
   * inactivos: un admin necesita ver lo que desactivo para reactivarlo.
   */
  @IsOptional()
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  @IsBoolean()
  activo?: boolean;
}

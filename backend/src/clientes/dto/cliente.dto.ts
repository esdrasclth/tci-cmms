import {
  Transform,
  Type,
} from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

import { TextoBorrable } from '../../comun/validacion';

/** TCI-36 — alta de cliente. */
export class CrearClienteDto {
  @IsString()
  @Length(2, 160)
  nombre!: string;

  /**
   * RTN hondureno: 14 digitos. Es opcional porque hay clientes pequenos sin el,
   * pero si viene tiene que ser unico (lo garantiza el indice de la tabla).
   */
  @IsOptional()
  @Matches(/^\d{14}$/, { message: 'El RTN debe tener 14 digitos.' })
  rtn?: string;

  @TextoBorrable(2, 120)
  contacto?: string;

  @TextoBorrable(6, 30)
  telefono?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo no tiene un formato valido.' })
  email?: string;
}

/** TCI-36 — edicion. `activo` es la baja logica. */
export class ActualizarClienteDto {
  @IsOptional()
  @IsString()
  @Length(2, 160)
  nombre?: string;

  @IsOptional()
  @Matches(/^\d{14}$/, { message: 'El RTN debe tener 14 digitos.' })
  rtn?: string;

  @TextoBorrable(2, 120)
  contacto?: string;

  @TextoBorrable(6, 30)
  telefono?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo no tiene un formato valido.' })
  email?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class FiltrarClientesDto {
  /** Busqueda por nombre, RTN o contacto. */
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

/** TCI-36 — sedes. Cuelgan siempre de un cliente. */
export class CrearSedeDto {
  @IsString()
  @Length(2, 160)
  nombre!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  direccion?: string;

  @TextoBorrable(2, 120)
  ciudad?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  referenciaGeo?: string;
}

export class ActualizarSedeDto {
  @IsOptional()
  @IsString()
  @Length(2, 160)
  nombre?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @TextoBorrable(2, 120)
  ciudad?: string;

  @IsOptional()
  @IsString()
  referenciaGeo?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

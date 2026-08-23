import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

import { Rol } from '../../generated/prisma/enums';

export class FiltrarUsuariosDto {
  @IsOptional()
  @IsEnum(Rol)
  rol?: Rol;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean()
  activo?: boolean;

  /** Busqueda por nombre o correo. */
  @IsOptional()
  @IsString()
  q?: string;
}

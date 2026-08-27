import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

import { Rol } from '../../generated/prisma/enums';

export class FiltrarUsuariosDto {
  @IsOptional()
  @IsEnum(Rol)
  rol?: Rol;

  @IsOptional()
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  @IsBoolean()
  activo?: boolean;

  /** Busqueda por nombre o correo. */
  @IsOptional()
  @IsString()
  q?: string;

  /**
   * Anade a cada usuario cuantas ordenes abiertas tiene.
   *
   * Va bajo peticion y no siempre: la pantalla de usuarios no lo muestra y no
   * tiene por que pagar la consulta. Lo pide el selector de tecnico al
   * asignar, que es donde el dato decide algo.
   */
  @IsOptional()
  @Transform(
    ({ value }: { value: unknown }) => value === 'true' || value === true,
  )
  @IsBoolean()
  conCarga?: boolean;
}

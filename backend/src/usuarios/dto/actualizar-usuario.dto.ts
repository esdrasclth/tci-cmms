import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

import { Rol } from '../../generated/prisma/enums';

/**
 * TCI-35 — edicion de un usuario por un administrador.
 *
 * El correo no se puede cambiar: es la identidad de la cuenta en Better Auth y
 * cambiarlo por fuera dejaria la fila de `accounts` desalineada. Si hace falta,
 * se crea otra cuenta y se desactiva la anterior.
 */
export class ActualizarUsuarioDto {
  @IsOptional()
  @IsString()
  @Length(3, 120)
  name?: string;

  @IsOptional()
  @IsEnum(Rol)
  rol?: Rol;

  /** Baja logica: el usuario deja de poder entrar, pero conserva su historial. */
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsString()
  @Length(6, 30)
  telefono?: string;
}

/** TCI-35 — reinicio de contrasena. Provisional mientras no exista TCI-34. */
export class ReiniciarContrasenaDto {
  @IsString()
  @MinLength(8)
  password!: string;
}

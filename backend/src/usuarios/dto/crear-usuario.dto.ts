import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

import { Rol } from '../../generated/prisma/enums';

/** TCI-35 — alta de usuario por un administrador. */
export class CrearUsuarioDto {
  @IsString()
  @Length(3, 120)
  name!: string;

  @IsEmail()
  email!: string;

  // Tiene que coincidir con `minPasswordLength` de auth.config.ts.
  @IsString()
  @MinLength(8)
  password!: string;

  // A diferencia del registro publico (que ya no existe), aqui el rol SI se
  // elige: quien llama es un administrador.
  @IsEnum(Rol)
  rol!: Rol;

  @IsOptional()
  @IsString()
  @Length(6, 30)
  telefono?: string;
}

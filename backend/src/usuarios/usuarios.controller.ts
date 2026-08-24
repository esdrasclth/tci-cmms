import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';

import { Roles } from '../auth/roles.decorator';
import { usuarioActual } from '../auth/usuario-actual';
import { Rol } from '../generated/prisma/enums';
import {
  ActualizarUsuarioDto,
  ReiniciarContrasenaDto,
} from './dto/actualizar-usuario.dto';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { FiltrarUsuariosDto } from './dto/filtrar-usuarios.dto';
import { UsuariosService } from './usuarios.service';

/**
 * TCI-35 — gestion de usuarios. `@Roles(ADMIN)` protege todo el controlador
 * (TCI-33); los servicios lo vuelven a comprobar como red de seguridad.
 *
 * El registro publico de Better Auth esta apagado (`disableSignUp`), asi que
 * POST /api/usuarios es la unica via de alta desde la aplicacion. El primer
 * administrador lo crea el seed (npm run db:seed).
 */
@Roles(Rol.ADMIN)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Post()
  crear(@Body() dto: CrearUsuarioDto, @Session() session: UserSession) {
    return this.usuarios.crear(dto, usuarioActual(session));
  }

  @Get()
  listar(
    @Query() filtros: FiltrarUsuariosDto,
    @Session() session: UserSession,
  ) {
    return this.usuarios.listar(filtros, usuarioActual(session));
  }

  @Patch(':id')
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarUsuarioDto,
    @Session() session: UserSession,
  ) {
    return this.usuarios.actualizar(id, dto, usuarioActual(session));
  }

  /** Provisional mientras TCI-34 no exista. Cierra las sesiones del usuario. */
  @Post(':id/contrasena')
  reiniciarContrasena(
    @Param('id') id: string,
    @Body() dto: ReiniciarContrasenaDto,
    @Session() session: UserSession,
  ) {
    return this.usuarios.reiniciarContrasena(
      id,
      dto.password,
      usuarioActual(session),
    );
  }
}

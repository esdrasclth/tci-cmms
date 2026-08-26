import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
  CambiarPlantillaDto,
  CambiarPreferenciaDto,
  FiltrarBandejaDto,
} from './dto/notificaciones.dto';
import { NotificacionesService } from './notificaciones.service';

/**
 * Modulo 8 — notificaciones.
 *
 * La bandeja es de cada quien: no hay `@Roles` y el usuario sale de la sesion,
 * nunca de un parametro. La configuracion —que se notifica, a que rol y por
 * donde— es de administrador.
 */
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificaciones: NotificacionesService) {}

  @Get()
  bandeja(
    @Query() filtros: FiltrarBandejaDto,
    @Session() session: UserSession,
  ) {
    return this.notificaciones.bandeja(usuarioActual(session).id, filtros);
  }

  @Patch(':id/leida')
  marcarLeida(@Param('id') id: string, @Session() session: UserSession) {
    return this.notificaciones.marcarLeida(id, usuarioActual(session).id);
  }

  @Post('leidas')
  @HttpCode(HttpStatus.OK)
  marcarTodas(@Session() session: UserSession) {
    return this.notificaciones.marcarTodasLeidas(usuarioActual(session).id);
  }

  /** TCI-54 y TCI-55 — que evento va a que rol y por que canal. */
  @Roles(Rol.ADMIN)
  @Get('preferencias')
  preferencias() {
    return this.notificaciones.preferencias();
  }

  @Roles(Rol.ADMIN)
  @Patch('preferencias/:id')
  cambiarPreferencia(
    @Param('id') id: string,
    @Body() dto: CambiarPreferenciaDto,
  ) {
    return this.notificaciones.cambiarPreferencia(id, dto.activo);
  }

  /** TCI-56 — el texto de cada notificacion. */
  @Roles(Rol.ADMIN)
  @Get('plantillas')
  plantillas() {
    return this.notificaciones.plantillas();
  }

  @Roles(Rol.ADMIN)
  @Patch('plantillas/:id')
  cambiarPlantilla(@Param('id') id: string, @Body() dto: CambiarPlantillaDto) {
    return this.notificaciones.cambiarPlantilla(id, dto);
  }
}

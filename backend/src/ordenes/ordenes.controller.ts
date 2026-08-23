import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';

import { Rol } from '../generated/prisma/enums';
import {
  AsignarOrdenDto,
  ComentarioOpcionalDto,
  CompletarOrdenDto,
  MotivoDto,
} from './dto/acciones.dto';
import { ActualizarOrdenDto } from './dto/actualizar-orden.dto';
import { CrearOrdenDto } from './dto/crear-orden.dto';
import { FiltrarOrdenesDto } from './dto/filtrar-ordenes.dto';
import { OrdenesService, UsuarioActual } from './ordenes.service';

/**
 * TCI-23 — CRUD de ordenes de trabajo.
 *
 * El estado NO se cambia por PATCH: cada transicion de TCI-78 tiene su propio
 * endpoint de accion bajo /ordenes/:id/<accion>. Ver docs/flujo-ordenes.md.
 *
 * El AuthGuard global de app.module.ts ya exige sesion en todas estas rutas.
 * La autorizacion fina (admin vs. tecnico asignado) vive en el servicio y en
 * OrdenEstadoService, porque depende de la orden concreta.
 */
@Controller('ordenes')
export class OrdenesController {
  constructor(private readonly ordenes: OrdenesService) {}

  @Post()
  crear(@Body() dto: CrearOrdenDto, @Session() session: UserSession) {
    return this.ordenes.crear(dto, actual(session));
  }

  @Get()
  listar(@Query() filtros: FiltrarOrdenesDto, @Session() session: UserSession) {
    return this.ordenes.listar(filtros, actual(session));
  }

  @Get(':id')
  obtener(@Param('id') id: string, @Session() session: UserSession) {
    return this.ordenes.obtener(id, actual(session));
  }

  @Patch(':id')
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarOrdenDto,
    @Session() session: UserSession,
  ) {
    return this.ordenes.actualizar(id, dto, actual(session));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param('id') id: string, @Session() session: UserSession) {
    return this.ordenes.eliminar(id, actual(session));
  }

  // --- Transiciones de estado (TCI-78) -------------------------------------

  /** TCI-28. */
  @Post(':id/asignar')
  asignar(
    @Param('id') id: string,
    @Body() dto: AsignarOrdenDto,
    @Session() session: UserSession,
  ) {
    return this.ordenes.transicionar(id, 'asignar', actual(session), {
      tecnicoId: dto.tecnicoId,
    });
  }

  /** TCI-28. */
  @Post(':id/reasignar')
  reasignar(
    @Param('id') id: string,
    @Body() dto: AsignarOrdenDto,
    @Session() session: UserSession,
  ) {
    return this.ordenes.transicionar(id, 'reasignar', actual(session), {
      tecnicoId: dto.tecnicoId,
    });
  }

  /** TCI-28. */
  @Post(':id/desasignar')
  desasignar(
    @Param('id') id: string,
    @Body() dto: ComentarioOpcionalDto,
    @Session() session: UserSession,
  ) {
    return this.ordenes.transicionar(id, 'desasignar', actual(session), {
      comentario: dto.comentario,
    });
  }

  @Post(':id/iniciar')
  iniciar(
    @Param('id') id: string,
    @Body() dto: ComentarioOpcionalDto,
    @Session() session: UserSession,
  ) {
    return this.ordenes.transicionar(id, 'iniciar', actual(session), {
      comentario: dto.comentario,
    });
  }

  @Post(':id/pausar')
  pausar(
    @Param('id') id: string,
    @Body() dto: MotivoDto,
    @Session() session: UserSession,
  ) {
    return this.ordenes.transicionar(id, 'pausar', actual(session), {
      motivo: dto.motivo,
    });
  }

  @Post(':id/reanudar')
  reanudar(
    @Param('id') id: string,
    @Body() dto: ComentarioOpcionalDto,
    @Session() session: UserSession,
  ) {
    return this.ordenes.transicionar(id, 'reanudar', actual(session), {
      comentario: dto.comentario,
    });
  }

  /** TCI-27. */
  @Post(':id/completar')
  completar(
    @Param('id') id: string,
    @Body() dto: CompletarOrdenDto,
    @Session() session: UserSession,
  ) {
    return this.ordenes.transicionar(id, 'completar', actual(session), {
      cierre: dto,
    });
  }

  /** TCI-27. */
  @Post(':id/cancelar')
  cancelar(
    @Param('id') id: string,
    @Body() dto: MotivoDto,
    @Session() session: UserSession,
  ) {
    return this.ordenes.transicionar(id, 'cancelar', actual(session), {
      motivo: dto.motivo,
    });
  }

  @Post(':id/reabrir')
  reabrir(
    @Param('id') id: string,
    @Body() dto: MotivoDto,
    @Session() session: UserSession,
  ) {
    return this.ordenes.transicionar(id, 'reabrir', actual(session), {
      motivo: dto.motivo,
    });
  }
}

/**
 * `rol` es un additionalField de Better Auth (ver auth.config.ts): existe en la
 * fila y viaja en la sesion, pero no esta en el tipo base de UserSession.
 */
function actual(session: UserSession): UsuarioActual {
  const user = session.user as UserSession['user'] & { rol?: Rol };
  return { id: user.id, rol: user.rol ?? Rol.TECNICO };
}

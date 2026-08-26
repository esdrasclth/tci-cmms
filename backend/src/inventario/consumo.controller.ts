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
} from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';

import { usuarioActual } from '../auth/usuario-actual';
import { ConsumoService } from './consumo.service';
import { CorregirConsumoDto, ImputarRepuestoDto } from './dto/consumo.dto';

/**
 * TCI-46 — repuestos consumidos en una orden.
 *
 * Las rutas cuelgan de la orden por la misma razon que las de evidencia
 * (TCI-43): el permiso es el de la orden, y colgarlas asi obliga a decir a que
 * orden pertenece cada operacion, de modo que no hay camino que se salte la
 * comprobacion de acceso.
 *
 * No hay `@Roles` aqui: el tecnico asignado imputa lo que gasta, que es
 * justamente el punto del work item. El filtro por orden lo hace el servicio.
 */
@Controller('ordenes/:ordenId/repuestos')
export class ConsumoController {
  constructor(private readonly consumo: ConsumoService) {}

  @Get()
  listar(@Param('ordenId') ordenId: string, @Session() session: UserSession) {
    return this.consumo.listar(ordenId, usuarioActual(session));
  }

  @Post()
  imputar(
    @Param('ordenId') ordenId: string,
    @Body() dto: ImputarRepuestoDto,
    @Session() session: UserSession,
  ) {
    return this.consumo.imputar(ordenId, dto, usuarioActual(session));
  }

  @Patch(':lineaId')
  corregir(
    @Param('ordenId') ordenId: string,
    @Param('lineaId') lineaId: string,
    @Body() dto: CorregirConsumoDto,
    @Session() session: UserSession,
  ) {
    return this.consumo.corregir(ordenId, lineaId, dto, usuarioActual(session));
  }

  @Delete(':lineaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  retirar(
    @Param('ordenId') ordenId: string,
    @Param('lineaId') lineaId: string,
    @Session() session: UserSession,
  ) {
    return this.consumo.retirar(ordenId, lineaId, usuarioActual(session));
  }
}

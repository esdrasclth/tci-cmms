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

import { Roles } from '../auth/roles.decorator';
import { Rol } from '../generated/prisma/enums';
import {
  ActualizarPlanDto,
  CrearPlanDto,
  FiltrarPlanesDto,
} from './dto/plan.dto';
import { PreventivoService } from './preventivo.service';

/**
 * TCI-49 — planes de mantenimiento preventivo.
 *
 * Todo de administrador: planificar el mantenimiento es una decision de la
 * gerencia. El tecnico ve el resultado —las ordenes que el plan genere— por el
 * camino de siempre.
 */
@Roles(Rol.ADMIN)
@Controller('planes-mantenimiento')
export class PreventivoController {
  constructor(private readonly preventivo: PreventivoService) {}

  @Get()
  listar(@Query() filtros: FiltrarPlanesDto) {
    return this.preventivo.listar(filtros);
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.preventivo.obtener(id);
  }

  /** A que equipos alcanza y cuando le toca a cada uno. */
  @Get(':id/equipos')
  equipos(@Param('id') id: string) {
    return this.preventivo.equipos(id);
  }

  @Post()
  crear(@Body() dto: CrearPlanDto) {
    return this.preventivo.crear(dto);
  }

  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() dto: ActualizarPlanDto) {
    return this.preventivo.actualizar(id, dto);
  }

  /** Borrado real. 422 si el plan ya genero ordenes. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param('id') id: string) {
    return this.preventivo.eliminar(id);
  }
}

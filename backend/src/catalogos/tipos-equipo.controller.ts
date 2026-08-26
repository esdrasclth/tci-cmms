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
  ActualizarTipoEquipoDto,
  CrearTipoEquipoDto,
  FiltrarTiposEquipoDto,
} from './dto/tipo-equipo.dto';
import { TiposEquipoService } from './tipos-equipo.service';

/**
 * TCI-49 — catalogo de tipos de equipo.
 *
 * Mismo reparto que en los tipos de mantenimiento (TCI-30): la lectura de los
 * activos no pide rol, porque quien da de alta un equipo necesita elegir el
 * tipo; el resto es de administrador.
 */
@Controller('tipos-equipo')
export class TiposEquipoController {
  constructor(private readonly tipos: TiposEquipoService) {}

  @Get()
  activos() {
    return this.tipos.activos();
  }

  @Roles(Rol.ADMIN)
  @Get('admin')
  listar(@Query() filtros: FiltrarTiposEquipoDto) {
    return this.tipos.listar(filtros);
  }

  @Roles(Rol.ADMIN)
  @Post()
  crear(@Body() dto: CrearTipoEquipoDto) {
    return this.tipos.crear(dto);
  }

  @Roles(Rol.ADMIN)
  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() dto: ActualizarTipoEquipoDto) {
    return this.tipos.actualizar(id, dto);
  }

  /** Borrado real. 422 si algun equipo o algun plan lo usa. */
  @Roles(Rol.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param('id') id: string) {
    return this.tipos.eliminar(id);
  }
}

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
  ActualizarEquipoDto,
  CrearEquipoDto,
  FiltrarEquiposDto,
} from './dto/equipo.dto';
import { EquiposService } from './equipos.service';
import { HistorialEquipoService } from './historial-equipo.service';

/**
 * TCI-37 — equipos por cliente.
 *
 * La lectura queda abierta a cualquier sesion (la usa el formulario de alta de
 * una orden y tambien el tecnico en campo); la escritura es solo de admin.
 */
@Controller('equipos')
export class EquiposController {
  constructor(
    private readonly equipos: EquiposService,
    private readonly historial: HistorialEquipoService,
  ) {}

  @Get()
  listar(@Query() filtros: FiltrarEquiposDto) {
    return this.equipos.listar(filtros);
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.equipos.obtener(id);
  }

  /**
   * TCI-57 — historial consolidado del equipo.
   *
   * Sin `@Roles`: lo consulta tambien el tecnico en campo, y a proposito ve
   * aqui las intervenciones de todos, no solo las suyas. Ver la nota del
   * servicio.
   */
  @Get(':id/historial')
  historialDelEquipo(@Param('id') id: string) {
    return this.historial.historial(id);
  }

  @Roles(Rol.ADMIN)
  @Post()
  crear(@Body() dto: CrearEquipoDto) {
    return this.equipos.crear(dto);
  }

  @Roles(Rol.ADMIN)
  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() dto: ActualizarEquipoDto) {
    return this.equipos.actualizar(id, dto);
  }

  /** Borrado logico. Se rechaza si el equipo tiene ordenes. */
  @Roles(Rol.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param('id') id: string) {
    return this.equipos.eliminar(id);
  }
}

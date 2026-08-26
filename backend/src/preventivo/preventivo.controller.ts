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
import { CalendarioService } from './calendario.service';
import {
  ActualizarPlanDto,
  CrearPlanDto,
  FiltrarPlanesDto,
  PeriodoCalendarioDto,
} from './dto/plan.dto';
import { GeneradorPreventivoService } from './generador.service';
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
  constructor(
    private readonly preventivo: PreventivoService,
    private readonly generador: GeneradorPreventivoService,
    private readonly calendario: CalendarioService,
  ) {}

  /**
   * TCI-51 — que mantenimientos preventivos caen en un rango.
   *
   * Cuelga de `/calendario` y va antes que `:id` para que Nest no interprete
   * "calendario" como el id de un plan.
   */
  @Get('calendario')
  verCalendario(@Query() periodo: PeriodoCalendarioDto) {
    return this.calendario.calendario(periodo);
  }

  /**
   * TCI-50 — dispara una pasada del generador a mano.
   *
   * Existe ademas del horario porque un plan recien creado no deberia esperar
   * a manana para producir sus ordenes, y porque poder ejecutarlo bajo demanda
   * es lo que hace verificable una tarea de fondo.
   */
  @Post('generar')
  @HttpCode(HttpStatus.OK)
  generarTodos() {
    return this.generador.generar();
  }

  @Post(':id/generar')
  @HttpCode(HttpStatus.OK)
  generarDelPlan(@Param('id') id: string) {
    return this.generador.generar(id);
  }

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

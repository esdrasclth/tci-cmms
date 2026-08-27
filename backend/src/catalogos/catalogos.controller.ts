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
  Put,
  Query,
} from '@nestjs/common';

import { Roles } from '../auth/roles.decorator';
import { Rol } from '../generated/prisma/enums';
import { CatalogosService } from './catalogos.service';
import { GuardarChecklistDto } from './dto/checklist.dto';
import {
  ActualizarTipoMantenimientoDto,
  CrearTipoMantenimientoDto,
  FiltrarTiposDto,
} from './dto/tipo-mantenimiento.dto';

/**
 * Catalogo de tipos de mantenimiento — TCI-30.
 *
 * Clientes y equipos tenian aqui su lectura provisional; desde TCI-36 y TCI-37
 * viven en sus propios modulos.
 *
 * El AuthGuard global ya exige sesion. La lectura no pide rol: cualquiera que
 * pueda crear una orden necesita leer el catalogo. La escritura es de admin.
 *
 * Hay dos lecturas distintas a proposito:
 *  - `GET /tipos-mantenimiento` — solo los activos, para el formulario de alta.
 *  - `GET /tipos-mantenimiento/admin` — todos, para la pantalla de gestion.
 */
@Controller('tipos-mantenimiento')
export class CatalogosController {
  constructor(private readonly catalogos: CatalogosService) {}

  @Get()
  tiposMantenimiento() {
    return this.catalogos.tiposMantenimiento();
  }

  /**
   * Cuelga de una subruta fija en vez de distinguirse por un query param para
   * que no haya forma de pedir los inactivos sin ser admin.
   */
  @Roles(Rol.ADMIN)
  @Get('admin')
  listar(@Query() filtros: FiltrarTiposDto) {
    return this.catalogos.listar(filtros);
  }

  @Roles(Rol.ADMIN)
  @Post()
  crear(@Body() dto: CrearTipoMantenimientoDto) {
    return this.catalogos.crear(dto);
  }

  @Roles(Rol.ADMIN)
  @Patch(':id')
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarTipoMantenimientoDto,
  ) {
    return this.catalogos.actualizar(id, dto);
  }

  /**
   * Plantilla de verificacion del tipo.
   *
   * La lectura queda abierta: la usa la pantalla de administracion, pero
   * tambien serviria para previsualizar antes de levantar una orden.
   */
  @Get(':id/checklist')
  listarChecklist(@Param('id') id: string) {
    return this.catalogos.listarChecklist(id);
  }

  @Roles(Rol.ADMIN)
  @Put(':id/checklist')
  guardarChecklist(
    @Param('id') id: string,
    @Body() dto: GuardarChecklistDto,
  ) {
    return this.catalogos.guardarChecklist(id, dto.items);
  }

  /** Borrado real. Se rechaza con 422 si alguna orden usa el tipo. */
  @Roles(Rol.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param('id') id: string) {
    return this.catalogos.eliminar(id);
  }
}

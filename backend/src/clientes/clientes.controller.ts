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
import { ClientesService } from './clientes.service';
import {
  ActualizarClienteDto,
  ActualizarSedeDto,
  CrearClienteDto,
  CrearSedeDto,
  FiltrarClientesDto,
} from './dto/cliente.dto';

/**
 * TCI-36 — clientes y sedes.
 *
 * La lectura queda abierta a cualquier sesion: el formulario de alta de una
 * orden necesita elegir cliente y sede, y lo usa tambien un tecnico. La
 * escritura es solo de administradores.
 */
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  @Get()
  listar(@Query() filtros: FiltrarClientesDto) {
    return this.clientes.listar(filtros);
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.clientes.obtener(id);
  }

  @Roles(Rol.ADMIN)
  @Post()
  crear(@Body() dto: CrearClienteDto) {
    return this.clientes.crear(dto);
  }

  @Roles(Rol.ADMIN)
  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() dto: ActualizarClienteDto) {
    return this.clientes.actualizar(id, dto);
  }

  /** Borrado logico. Se rechaza si el cliente tiene ordenes. */
  @Roles(Rol.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param('id') id: string) {
    return this.clientes.eliminar(id);
  }

  @Roles(Rol.ADMIN)
  @Post(':id/sedes')
  crearSede(@Param('id') id: string, @Body() dto: CrearSedeDto) {
    return this.clientes.crearSede(id, dto);
  }
}

/** Las sedes se editan por su propio id, no anidadas bajo el cliente. */
@Roles(Rol.ADMIN)
@Controller('sedes')
export class SedesController {
  constructor(private readonly clientes: ClientesService) {}

  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() dto: ActualizarSedeDto) {
    return this.clientes.actualizarSede(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param('id') id: string) {
    return this.clientes.eliminarSede(id);
  }
}

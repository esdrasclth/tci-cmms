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

import { Roles } from '../auth/roles.decorator';
import { usuarioActual } from '../auth/usuario-actual';
import { Rol, TipoMovimiento } from '../generated/prisma/enums';
import {
  ActualizarRepuestoDto,
  CrearRepuestoDto,
  FiltrarLibroDto,
  FiltrarMovimientosDto,
  FiltrarRepuestosDto,
  RegistrarMovimientoDto,
} from './dto/repuesto.dto';
import { InventarioService } from './inventario.service';

/**
 * Catalogo de repuestos — TCI-45, con los avisos de minimos de TCI-47.
 *
 * Mismo reparto que en los tipos de mantenimiento (TCI-30): la lectura del
 * catalogo disponible no pide rol, porque el tecnico que imputa consumo
 * necesita elegir; todo lo demas es de administrador.
 */
@Controller('repuestos')
export class RepuestosController {
  constructor(private readonly inventario: InventarioService) {}

  /** Lo que se puede imputar hoy: activos y con existencia. */
  @Get()
  disponibles() {
    return this.inventario.disponibles();
  }

  /**
   * Cuelga de una subruta fija y no de un query param, por el mismo motivo que
   * en el catalogo de tipos: que no haya forma de ver el catalogo completo
   * —incluidos costos y repuestos retirados— sin ser admin.
   */
  @Roles(Rol.ADMIN)
  @Get('admin')
  listar(@Query() filtros: FiltrarRepuestosDto) {
    return this.inventario.listar(filtros);
  }

  /** TCI-47 — repuestos en o por debajo del minimo. */
  @Roles(Rol.ADMIN)
  @Get('alertas')
  alertas() {
    return this.inventario.alertas();
  }

  /** TCI-48 — el libro de todo el almacen, no el de un repuesto. */
  @Roles(Rol.ADMIN)
  @Get('movimientos')
  libro(@Query() filtros: FiltrarLibroDto) {
    return this.inventario.libro(filtros);
  }

  @Roles(Rol.ADMIN)
  @Get(':id/movimientos')
  movimientos(
    @Param('id') id: string,
    @Query() filtros: FiltrarMovimientosDto,
  ) {
    return this.inventario.movimientos(id, filtros);
  }

  @Roles(Rol.ADMIN)
  @Post()
  crear(@Body() dto: CrearRepuestoDto) {
    return this.inventario.crear(dto);
  }

  /** Entrada de almacen: una compra que llega, una devolucion del taller. */
  @Roles(Rol.ADMIN)
  @Post(':id/entradas')
  entrada(
    @Param('id') id: string,
    @Body() dto: RegistrarMovimientoDto,
    @Session() session: UserSession,
  ) {
    return this.inventario.registrarMovimiento(
      id,
      TipoMovimiento.ENTRADA,
      dto,
      usuarioActual(session).id,
    );
  }

  /** Salida que no es consumo de una orden: merma, rotura, correccion. */
  @Roles(Rol.ADMIN)
  @Post(':id/salidas')
  salida(
    @Param('id') id: string,
    @Body() dto: RegistrarMovimientoDto,
    @Session() session: UserSession,
  ) {
    return this.inventario.registrarMovimiento(
      id,
      TipoMovimiento.SALIDA,
      dto,
      usuarioActual(session).id,
    );
  }

  @Roles(Rol.ADMIN)
  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() dto: ActualizarRepuestoDto) {
    return this.inventario.actualizar(id, dto);
  }

  /** Borrado real. 422 si el repuesto ya se movio o se imputo alguna vez. */
  @Roles(Rol.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param('id') id: string) {
    return this.inventario.eliminar(id);
  }
}

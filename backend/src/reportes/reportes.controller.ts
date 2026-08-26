import {
  Controller,
  Get,
  Header,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';

import { Roles } from '../auth/roles.decorator';
import { Rol } from '../generated/prisma/enums';
import { ExportarDto, PeriodoDto } from './dto/reportes.dto';
import { ExportacionService } from './exportacion.service';
import { ReportesService } from './reportes.service';

/**
 * Modulo 9 — reportes e historial.
 *
 * Todo es de administrador: son las preguntas de la gerencia sobre el trabajo
 * del equipo, no las del tecnico sobre el suyo. El historial que si necesita el
 * tecnico es el del equipo, y ese vive en `GET /equipos/:id/historial`
 * (TCI-57), fuera de aqui, precisamente porque tiene otro publico y otro
 * permiso.
 */
@Roles(Rol.ADMIN)
@Controller('reportes')
export class ReportesController {
  constructor(
    private readonly reportes: ReportesService,
    private readonly exportacion: ExportacionService,
  ) {}

  /** TCI-60 — tablero de indicadores. */
  @Get('resumen')
  resumen(@Query() periodo: PeriodoDto) {
    return this.reportes.resumen(periodo);
  }

  /** TCI-58 — carga y desempeno por tecnico en el periodo. */
  @Get('tecnicos')
  porTecnico(@Query() periodo: PeriodoDto) {
    return this.reportes.porTecnico(periodo);
  }

  /**
   * TCI-59 — el mismo listado del reporte, en archivo.
   *
   * Un solo endpoint para los dos formatos: cambia el `Content-Type` y el
   * nombre del archivo, pero la consulta y los filtros son identicos, y
   * partirlo en dos rutas duplicaria la validacion del periodo.
   */
  @Get('ordenes')
  @Header('Cache-Control', 'no-store')
  async exportar(
    @Query() filtros: ExportarDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const ordenes = await this.reportes.ordenesDelPeriodo(
      filtros,
      filtros.limite,
    );

    const sello = new Date().toISOString().slice(0, 10);

    if (filtros.formato === 'pdf') {
      const pdf = await this.exportacion.pdf(ordenes, {
        desde: filtros.desde,
        hasta: filtros.hasta,
        titulo: 'Reporte de ordenes de trabajo',
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="ordenes-tci-${sello}.pdf"`,
      );
      return new StreamableFile(pdf);
    }

    const csv = this.exportacion.csv(ordenes);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ordenes-tci-${sello}.csv"`,
    );
    return new StreamableFile(csv);
  }
}

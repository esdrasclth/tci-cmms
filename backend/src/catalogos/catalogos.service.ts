import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Catalogo de tipos de mantenimiento (TCI-30, parcial: solo lectura).
 *
 * No exige rol: cualquiera con sesion que pueda crear una orden necesita poder
 * elegir el tipo. La escritura y su pantalla siguen pendientes.
 */
@Injectable()
export class CatalogosService {
  constructor(private readonly prisma: PrismaService) {}

  tiposMantenimiento() {
    return this.prisma.tipoMantenimiento.findMany({
      where: { activo: true },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        color: true,
        // Lo usa el formulario para exigir equipo (regla 3 de TCI-22).
        requiereEquipo: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }
}

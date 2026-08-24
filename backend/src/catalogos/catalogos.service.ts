import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Lecturas de catalogo que necesita el formulario de alta de una orden.
 *
 * Es el minimo para que TCI-23 sea usable desde la interfaz. El CRUD completo
 * de estas entidades son TCI-30 (tipos de mantenimiento), TCI-36 (clientes) y
 * TCI-37 (equipos); aqui solo hay lectura, y solo de lo que esta activo.
 *
 * No exige rol: cualquiera con sesion que pueda crear una orden necesita poder
 * elegir cliente, sede, equipo y tipo.
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

  /** Clientes con sus sedes: el desplegable de sede depende del cliente. */
  clientes() {
    return this.prisma.cliente.findMany({
      where: { activo: true, deletedAt: null },
      select: {
        id: true,
        nombre: true,
        sedes: {
          where: { activo: true, deletedAt: null },
          select: { id: true, nombre: true, ciudad: true },
          orderBy: { nombre: 'asc' },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  /**
   * Equipos de un cliente. Se filtran por cliente y no se devuelven todos
   * juntos porque una orden solo puede apuntar a un equipo de su cliente.
   */
  equiposDeCliente(clienteId: string) {
    return this.prisma.equipo.findMany({
      where: { clienteId, activo: true, deletedAt: null },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        sedeId: true,
      },
      orderBy: { codigo: 'asc' },
    });
  }
}

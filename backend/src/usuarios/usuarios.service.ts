import {
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';

import type { Auth } from '../auth/auth.config';
import { Prisma } from '../generated/prisma/client';
import { Rol } from '../generated/prisma/enums';
import type { UsuarioActual } from '../ordenes/ordenes.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  UsuarioYaExisteError,
  crearUsuarioConCredenciales,
} from './crear-usuario-credenciales';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { FiltrarUsuariosDto } from './dto/filtrar-usuarios.dto';

/** Nunca se devuelve el hash ni las cuentas: solo lo que la UI necesita. */
const CAMPOS_PUBLICOS = {
  id: true,
  name: true,
  email: true,
  rol: true,
  activo: true,
  telefono: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService<Auth>,
  ) {}

  /** TCI-35. El registro publico esta cerrado: esta es la unica alta. */
  async crear(dto: CrearUsuarioDto, usuario: UsuarioActual) {
    this.exigirAdmin(usuario, 'crear usuarios');

    try {
      const creado = await crearUsuarioConCredenciales(this.auth.instance, {
        name: dto.name,
        email: dto.email,
        password: dto.password,
        rol: dto.rol,
        telefono: dto.telefono,
      });

      return this.prisma.user.findUniqueOrThrow({
        where: { id: creado.id },
        select: CAMPOS_PUBLICOS,
      });
    } catch (error) {
      if (error instanceof UsuarioYaExisteError) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }
  }

  /**
   * Listado de usuarios. Lo necesita el panel de administracion y tambien el
   * desplegable de asignacion de tecnico de una orden (TCI-28).
   */
  async listar(filtros: FiltrarUsuariosDto, usuario: UsuarioActual) {
    this.exigirAdmin(usuario, 'consultar usuarios');

    const where: Prisma.UserWhereInput = {};
    if (filtros.rol) where.rol = filtros.rol;
    if (filtros.activo !== undefined) where.activo = filtros.activo;
    if (filtros.q?.trim()) {
      const q = filtros.q.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: CAMPOS_PUBLICOS,
      orderBy: { name: 'asc' },
    });
  }

  private exigirAdmin(usuario: UsuarioActual, accion: string) {
    if (usuario.rol !== Rol.ADMIN) {
      throw new ForbiddenException(`Solo un administrador puede ${accion}.`);
    }
  }
}

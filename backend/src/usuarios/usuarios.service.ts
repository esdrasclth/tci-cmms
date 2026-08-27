import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';

import type { Auth } from '../auth/auth.config';
import { Prisma } from '../generated/prisma/client';
import { OrdenEstado, Rol } from '../generated/prisma/enums';
import type { UsuarioActual } from '../ordenes/ordenes.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  UsuarioYaExisteError,
  crearUsuarioConCredenciales,
  reiniciarContrasena,
} from './crear-usuario-credenciales';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
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

    const usuarios = await this.prisma.user.findMany({
      where,
      select: CAMPOS_PUBLICOS,
      orderBy: { name: 'asc' },
    });

    if (!filtros.conCarga) return usuarios;

    /*
     * Un solo `groupBy` para todos, y no un `count` por usuario: lo segundo
     * son tantas consultas como tecnicos, y es el N+1 clasico de este tipo de
     * pantalla.
     *
     * "Abierta" es todo lo que no es un estado final. Se enumeran los finales
     * en vez de los abiertos porque son dos y no cambian; la lista de estados
     * intermedios si ha crecido antes.
     */
    const cargas = await this.prisma.ordenTrabajo.groupBy({
      by: ['tecnicoId'],
      where: {
        deletedAt: null,
        tecnicoId: { in: usuarios.map((u) => u.id) },
        estado: { notIn: [OrdenEstado.COMPLETADA, OrdenEstado.CANCELADA] },
      },
      _count: { _all: true },
    });

    const porTecnico = new Map(
      cargas.map((c) => [c.tecnicoId, c._count._all]),
    );

    return usuarios.map((u) => ({
      ...u,
      ordenesAbiertas: porTecnico.get(u.id) ?? 0,
    }));
  }

  /** TCI-35 — editar nombre, rol, telefono o dar de baja. */
  async actualizar(
    id: string,
    dto: ActualizarUsuarioDto,
    usuario: UsuarioActual,
  ) {
    this.exigirAdmin(usuario, 'editar usuarios');

    const objetivo = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, rol: true, activo: true },
    });
    if (!objetivo) {
      throw new NotFoundException(`No existe el usuario ${id}.`);
    }

    const sePierdeElAdmin =
      (dto.rol !== undefined && dto.rol !== Rol.ADMIN) || dto.activo === false;

    // Sin estas dos guardas el sistema se puede quedar sin nadie que administre,
    // y no hay forma de arreglarlo desde la propia aplicacion.
    if (sePierdeElAdmin && objetivo.id === usuario.id) {
      throw new UnprocessableEntityException(
        'No puede quitarse a si mismo el rol de administrador ni desactivarse.',
      );
    }
    if (sePierdeElAdmin && objetivo.rol === Rol.ADMIN && objetivo.activo) {
      const otrosAdmins = await this.prisma.user.count({
        where: { rol: Rol.ADMIN, activo: true, id: { not: id } },
      });
      if (otrosAdmins === 0) {
        throw new UnprocessableEntityException(
          'Es el unico administrador activo: el sistema no puede quedarse sin administradores.',
        );
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        rol: dto.rol,
        activo: dto.activo,
        telefono: dto.telefono,
      },
      select: CAMPOS_PUBLICOS,
    });
  }

  /**
   * TCI-35 — reinicio de contrasena por un administrador.
   *
   * Via provisional mientras TCI-34 (recuperacion por correo) no exista. Cierra
   * las sesiones abiertas del usuario.
   */
  async reiniciarContrasena(
    id: string,
    password: string,
    usuario: UsuarioActual,
  ): Promise<{ ok: true }> {
    this.exigirAdmin(usuario, 'reiniciar contrasenas');

    const objetivo = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!objetivo) {
      throw new NotFoundException(`No existe el usuario ${id}.`);
    }

    await reiniciarContrasena(this.auth.instance, id, password);
    return { ok: true };
  }

  private exigirAdmin(usuario: UsuarioActual, accion: string) {
    if (usuario.rol !== Rol.ADMIN) {
      throw new ForbiddenException(`Solo un administrador puede ${accion}.`);
    }
  }
}

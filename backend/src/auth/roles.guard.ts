import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService, type UserSession } from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';

import { Rol } from '../generated/prisma/enums';
import type { Auth } from './auth.config';
import { ROLES_KEY } from './roles.decorator';

/**
 * Guard global de autorizacion (TCI-33).
 *
 * Hace dos cosas sobre toda peticion con sesion:
 *
 *  1. **Corta a los usuarios desactivados.** El hook de auth.config.ts impide
 *     que obtengan una sesion nueva, pero quien ya tuviera una abierta cuando
 *     se le dio de baja seguiria entrando hasta que caducara. Aqui se corta.
 *  2. **Aplica `@Roles(...)`** cuando la ruta lo declara.
 *
 * No sustituye a las comprobaciones de los servicios: un guard no conoce el
 * recurso, asi que reglas como "solo el tecnico asignado a esta orden" siguen
 * donde estan.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService<Auth>,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const peticion = contexto
      .switchToHttp()
      .getRequest<Request & { session?: UserSession | null }>();

    const sesion = await this.resolverSesion(peticion);

    // Sin sesion no hay nada que autorizar: o la ruta es publica, o el
    // AuthGuard de la libreria la rechazara con 401.
    if (!sesion?.user) return true;

    const usuario = sesion.user as UserSession['user'] & {
      rol?: Rol;
      activo?: boolean;
    };

    if (usuario.activo === false) {
      throw new ForbiddenException(
        'Su cuenta esta desactivada. Contacte al administrador.',
      );
    }

    const exigidos = this.reflector.getAllAndOverride<Rol[] | undefined>(
      ROLES_KEY,
      [contexto.getHandler(), contexto.getClass()],
    );
    if (!exigidos?.length) return true;

    if (!usuario.rol || !exigidos.includes(usuario.rol)) {
      throw new ForbiddenException(
        'No tiene permisos suficientes para esta operacion.',
      );
    }

    return true;
  }

  /**
   * El AuthGuard de la libreria deja la sesion en `request.session`, pero el
   * orden entre guards globales no esta garantizado. Si todavia no esta, se
   * resuelve aqui: con la cache en cookie es verificar una firma, no una
   * consulta a la base.
   */
  private async resolverSesion(
    peticion: Request & { session?: UserSession | null },
  ): Promise<UserSession | null> {
    if (peticion.session !== undefined) return peticion.session;

    try {
      return await this.auth.api.getSession({
        headers: peticion.headers as unknown as Headers,
      });
    } catch {
      return null;
    }
  }
}

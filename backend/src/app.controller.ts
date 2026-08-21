import {
  Public,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Health check para Dokploy y el healthcheck de Docker (TCI-61, TCI-69).
   * Excluido del prefijo /api y publico: no exige sesion.
   */
  @Public()
  @Get('health')
  health(): { status: string; timestamp: string } {
    return this.appService.health();
  }

  /**
   * Devuelve la sesion actual. Sirve para verificar de punta a punta que el
   * login y el AuthGuard global funcionan (TCI-31, TCI-33).
   */
  @Get('me')
  me(@Session() session: UserSession) {
    return session.user;
  }
}

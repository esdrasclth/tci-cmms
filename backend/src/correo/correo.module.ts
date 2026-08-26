import { Global, Module } from '@nestjs/common';

import { CorreoService } from './correo.service';

/**
 * Correo saliente.
 *
 * Global porque lo van a necesitar sitios que no se conocen entre si: los
 * avisos preventivos (TCI-52), la recuperacion de contrasena (TCI-34) y el
 * modulo de notificaciones (TCI-54). Importarlo en cada uno solo anadiria ruido.
 */
@Global()
@Module({
  providers: [CorreoService],
  exports: [CorreoService],
})
export class CorreoModule {}

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types';

import { AppModule } from '../../src/app.module';

/**
 * Levanta el AppModule igual que lo hace src/main.ts.
 *
 * La fidelidad con main.ts es el punto: si el e2e no montara el mismo
 * ValidationPipe, los tests de validacion de DTO pasarian sin probar nada de lo
 * que corre en produccion. Cualquier cambio en el arranque de main.ts hay que
 * replicarlo aqui.
 */
export async function crearAppE2E(): Promise<INestApplication<App>> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  // bodyParser: false es obligatorio con @thallesp/nestjs-better-auth.
  const app = moduleFixture.createNestApplication<INestApplication<App>>({
    bodyParser: false,
  });

  app.setGlobalPrefix('api', { exclude: ['health'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();
  return app;
}

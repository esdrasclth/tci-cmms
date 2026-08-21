import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // bodyParser: false es obligatorio con @thallesp/nestjs-better-auth. El modulo
  // aplica su propio body parser a todas las rutas EXCEPTO /api/auth/*, donde
  // Better Auth necesita leer el stream crudo.
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.setGlobalPrefix('api', { exclude: ['health'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // El CORS lo configura AuthModule a partir de `trustedOrigins`
  // (ver src/auth/auth.config.ts), por eso no se llama app.enableCors() aqui.

  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`API escuchando en http://localhost:${port}`);
}

void bootstrap();

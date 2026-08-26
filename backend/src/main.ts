import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { origenesConfiados } from './auth/auth.config';

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

  /*
   * CORS explicito, y no el que monta @thallesp/nestjs-better-auth.
   *
   * Ese modulo fija `methods: ['GET','POST','PUT','DELETE']` sin dejar
   * configurarlo, asi que el preflight de cualquier PATCH se respondia sin
   * PATCH en `Access-Control-Allow-Methods` y el navegador lo abortaba antes de
   * enviarlo. La API usa PATCH para toda edicion —ordenes, clientes, equipos,
   * usuarios, repuestos—, de modo que desde el navegador no se podia editar
   * nada. Por eso el modulo va con `disableTrustedOriginsCors: true` y la
   * politica se declara aqui, sobre la misma lista de origenes.
   */
  app.enableCors({
    origin: origenesConfiados(),
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`API escuchando en http://localhost:${port}`);
}

void bootstrap();

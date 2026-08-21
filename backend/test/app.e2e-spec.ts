import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from './../src/app.module';

// Este e2e levanta el AppModule completo, asi que necesita la base de datos
// arriba: `docker compose up -d postgres` desde la raiz del repo.
describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    app.setGlobalPrefix('api', { exclude: ['health'] });
    await app.init();
  });

  it('/health (GET) es publico y responde ok', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        const body = res.body as { status: string };
        expect(body.status).toBe('ok');
      });
  });

  it('/api/me (GET) sin sesion responde 401', () => {
    return request(app.getHttpServer()).get('/api/me').expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});

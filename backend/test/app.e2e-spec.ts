import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';

import { crearAppE2E } from './utils/app-e2e';

// Este e2e levanta el AppModule completo, asi que necesita la base de datos
// arriba: `docker compose up -d postgres` desde la raiz del repo.
describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await crearAppE2E();
  });

  afterAll(async () => {
    await app?.close();
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
});

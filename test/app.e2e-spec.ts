import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import { createTestApp } from './helpers/test-app';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const testContext = await createTestApp();
    app = testContext.app;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer() as Server)
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});

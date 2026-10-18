import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- supertest/express type inference quirk in this toolchain, not a real type issue.
    return request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok' });
  });

  afterEach(async () => {
    await app.close();
  });
});

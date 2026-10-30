import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  const trustProxy = configService.get<string>('TRUST_PROXY');
  if (trustProxy) {
    app.set('trust proxy', trustProxy);
  }

  app.use(cookieParser());
  app.enableCors({
    origin: configService.getOrThrow<string>('CORS_ORIGIN'),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.getOrThrow<number>('PORT');
  const host = configService.get<string>('HOST');
  if (host) {
    await app.listen(port, host);
  } else {
    await app.listen(port);
  }
}

await bootstrap();

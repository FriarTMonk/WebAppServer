// Polyfill crypto for @nestjs/schedule
import * as cryptoModule from 'crypto';
(global as any).crypto = cryptoModule;

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS - only allow web app on port 3699
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3699',
    credentials: true,
  });

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  const port = process.env.PORT || 3697;
  await app.listen(port);

  console.log(`🚀 API server running on http://localhost:${port}`);
}

bootstrap();

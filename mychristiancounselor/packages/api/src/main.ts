// Polyfill crypto for @nestjs/schedule
import * as cryptoModule from 'crypto';
(global as any).crypto = cryptoModule;

// Initialize Sentry as early as possible
import { initializeSentry } from './common/sentry/sentry.config';
initializeSentry();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body parsing for Stripe webhooks
    bufferLogs: true, // Buffer logs until Winston is ready
  });

  // Use Winston logger
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  // Security: Helmet for HTTP security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow embedding for development
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    })
  );

  // Enable CORS - only allow web app on port 3699
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3699',
    credentials: true,
  });

  // Global exception filter for consistent error handling
  app.useGlobalFilters(new HttpExceptionFilter());

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('MyChristianCounselor API')
    .setDescription('API documentation for MyChristianCounselor platform')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('counsel', 'Counseling session endpoints')
    .addTag('subscriptions', 'Subscription and billing endpoints')
    .addTag('organizations', 'Organization management endpoints')
    .addTag('admin', 'Platform administration endpoints')
    .addTag('support', 'Support ticket endpoints')
    .addTag('health', 'Health check endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth'
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'MyChristianCounselor API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  const port = process.env.PORT || 3697;
  await app.listen(port);

  logger.log(`🚀 API server running on http://localhost:${port}`);
  logger.log(`🔒 Security headers enabled with Helmet`);
  logger.log(`📚 API documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();

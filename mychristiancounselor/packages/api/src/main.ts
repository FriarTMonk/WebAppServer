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

/**
 * Validates that all required environment variables are set and properly formatted.
 * Throws an error if any required variables are missing or invalid.
 * Should be called before application bootstrap.
 */
function validateEnvironment(): void {
  const errors: string[] = [];

  // Define required environment variables
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'OPENAI_API_KEY',
    'POSTMARK_API_TOKEN',
    'FROM_EMAIL',
    'WEB_APP_URL',
  ];

  // Check for missing variables
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    errors.push(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate JWT_SECRET length (must be at least 32 characters for security)
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters for security');
  }

  // Validate JWT_REFRESH_SECRET length
  if (
    process.env.JWT_REFRESH_SECRET &&
    process.env.JWT_REFRESH_SECRET.length < 32
  ) {
    errors.push(
      'JWT_REFRESH_SECRET must be at least 32 characters for security'
    );
  }

  // Validate DATABASE_URL format (basic check for PostgreSQL)
  if (
    process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.startsWith('postgresql://')
  ) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
  }

  // Validate FROM_EMAIL format
  if (process.env.FROM_EMAIL) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(process.env.FROM_EMAIL)) {
      errors.push('FROM_EMAIL must be a valid email address');
    }
  }

  // Validate WEB_APP_URL format
  if (process.env.WEB_APP_URL) {
    try {
      new URL(process.env.WEB_APP_URL);
    } catch {
      errors.push('WEB_APP_URL must be a valid URL');
    }
  }

  // In production, enforce additional security requirements
  if (process.env.NODE_ENV === 'production') {
    // Ensure WEB_APP_URL uses HTTPS
    if (
      process.env.WEB_APP_URL &&
      !process.env.WEB_APP_URL.startsWith('https://')
    ) {
      errors.push('WEB_APP_URL must use HTTPS in production');
    }

    // Ensure DATABASE_URL uses SSL
    if (
      process.env.DATABASE_URL &&
      !process.env.DATABASE_URL.includes('sslmode=require')
    ) {
      errors.push(
        'DATABASE_URL must include sslmode=require in production for security'
      );
    }

    // Warn about optional but recommended production variables
    const recommended = ['SENTRY_DSN', 'STRIPE_SECRET_KEY'];
    const missingRecommended = recommended.filter((key) => !process.env[key]);
    if (missingRecommended.length > 0) {
      console.warn(
        `⚠️  Recommended environment variables not set: ${missingRecommended.join(', ')}`
      );
    }
  }

  // If there are any errors, throw and prevent application startup
  if (errors.length > 0) {
    const errorMessage = [
      '❌ Environment validation failed:',
      ...errors.map((err) => `   - ${err}`),
      '',
      'Please check your .env file or environment configuration.',
      'See .env.example for required variables.',
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Log success in production
  if (process.env.NODE_ENV === 'production') {
    console.log('✅ Environment validation passed');
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body parsing for Stripe webhooks
    bufferLogs: true, // Buffer logs until Winston is ready
  });

  // Use Winston logger
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  // Force HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      // Check if request is already HTTPS (via x-forwarded-proto header from load balancer)
      if (req.headers['x-forwarded-proto'] !== 'https') {
        const httpsUrl = `https://${req.headers.host}${req.url}`;
        logger.warn(`Redirecting HTTP request to HTTPS: ${req.url}`);
        return res.redirect(301, httpsUrl);
      }
      next();
    });
  }

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

// Validate environment variables before starting the application
validateEnvironment();

bootstrap();

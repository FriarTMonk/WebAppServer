// Node.js 20+ has native global.crypto, no polyfill needed

// Polyfill File API for undici compatibility
// This is required because undici's fetch implementation expects File to be globally available
// but Node.js doesn't provide it natively. This prevents "File is not defined" errors.
if (typeof global.File === 'undefined') {
  // @ts-ignore - File is not in Node.js global types by default
  global.File = class File extends Blob {
    constructor(bits: BlobPart[], name: string, options?: FilePropertyBag) {
      super(bits, options);
      this.name = name;
      this.lastModified = options?.lastModified ?? Date.now();
    }
    name: string;
    lastModified: number;
  };
}

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
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    // POSTMARK_API_KEY is optional because mock mode is default
    // 'POSTMARK_API_KEY',
    // 'POSTMARK_FROM_EMAIL',
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

  // Validate POSTMARK_FROM_EMAIL format
  if (process.env.POSTMARK_FROM_EMAIL) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(process.env.POSTMARK_FROM_EMAIL)) {
      errors.push('POSTMARK_FROM_EMAIL must be a valid email address');
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
  console.log('🚀 Starting MyChristianCounselor API...');
  console.log(`   Node.js version: ${process.version}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  console.log('');

  console.log('📦 Creating NestJS application...');
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body parsing for Stripe webhooks
    bufferLogs: true, // Buffer logs until Winston is ready
  });
  console.log('✅ NestJS application created');

  // Use Winston logger
  console.log('📝 Initializing Winston logger...');
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);
  logger.log('✅ Winston logger initialized');

  // Force HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    logger.log('🔒 Configuring HTTPS redirect...');
    app.use((req, res, next) => {
      // Allow HTTP for health check endpoints (needed for load balancer health checks)
      if (req.url.startsWith('/health/')) {
        return next();
      }

      // Check if request is already HTTPS (via x-forwarded-proto header from load balancer)
      if (req.headers['x-forwarded-proto'] !== 'https') {
        const httpsUrl = `https://${req.headers.host}${req.url}`;
        logger.warn(`Redirecting HTTP request to HTTPS: ${req.url}`);
        return res.redirect(301, httpsUrl);
      }
      next();
    });
    logger.log('✅ HTTPS redirect configured');
  }

  // Security: Helmet for HTTP security headers
  logger.log('🛡️  Configuring security headers...');
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
  logger.log('✅ Security headers configured');

  // Enable CORS - allow web app and www variant
  logger.log('🌐 Configuring CORS...');
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:3699'];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  logger.log(`✅ CORS enabled for origins: ${corsOrigins.join(', ')}`);

  // Global exception filter for consistent error handling
  logger.log('🔧 Configuring global exception filter...');
  app.useGlobalFilters(new HttpExceptionFilter());
  logger.log('✅ Global exception filter configured');

  // Enable validation
  logger.log('✔️  Enabling request validation...');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );
  logger.log('✅ Request validation enabled');

  // Swagger API Documentation
  logger.log('📚 Setting up Swagger API documentation...');
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
  logger.log('✅ Swagger documentation configured');

  const port = process.env.PORT || 3697;
  logger.log(`🎧 Starting server on port ${port}...`);
  await app.listen(port);

  logger.log('');
  logger.log('═══════════════════════════════════════════════════════');
  logger.log('✅ APPLICATION SUCCESSFULLY STARTED');
  logger.log('═══════════════════════════════════════════════════════');
  logger.log(`🚀 API server listening on port ${port}`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`🔒 Security: Helmet headers enabled`);
  logger.log(`🌐 CORS: Enabled for ${corsOrigins.length} origin(s)`);
  logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  logger.log(`🏥 Health check: http://localhost:${port}/health/ready`);
  logger.log(`⏱️  Uptime: ${Math.floor(process.uptime())}s`);
  logger.log(`💾 Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB / ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`);
  logger.log('═══════════════════════════════════════════════════════');
  logger.log('');

  // Report successful startup to Sentry
  const Sentry = require('@sentry/nestjs');
  Sentry.addBreadcrumb({
    category: 'startup',
    message: 'Application successfully started',
    level: 'info',
    data: {
      port,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      uptime: Math.floor(process.uptime()),
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
  });
}

// Validate environment variables before starting the application
validateEnvironment();

bootstrap().catch((error) => {
  console.error('');
  console.error('═══════════════════════════════════════════════════════');
  console.error('❌ APPLICATION STARTUP FAILED');
  console.error('═══════════════════════════════════════════════════════');
  console.error(`Error: ${error.message}`);
  console.error(`Stack: ${error.stack}`);
  console.error('═══════════════════════════════════════════════════════');
  console.error('');

  // Report startup failure to Sentry
  const Sentry = require('@sentry/nestjs');
  Sentry.captureException(error, {
    level: 'fatal',
    tags: {
      startup: 'failed',
      environment: process.env.NODE_ENV || 'development',
    },
    contexts: {
      startup: {
        phase: 'bootstrap',
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
      },
    },
  });

  // Wait for Sentry to flush before exiting
  Sentry.close(2000).then(() => {
    process.exit(1);
  });
});

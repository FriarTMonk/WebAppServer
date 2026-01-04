import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
  details?: any;
}

interface HealthStatus {
  isHealthy: boolean;
  checks: HealthCheck[];
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private redisClient: Redis;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Initialize Redis client for health checks
    const redisHost = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const redisPort = this.configService.get<number>('REDIS_PORT') || 6379;
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');

    this.redisClient = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      lazyConnect: true,
      retryStrategy: () => null, // Don't retry for health checks
      maxRetriesPerRequest: 1,
    });
  }

  /**
   * Check readiness of the application
   * Tests database connectivity, Redis, environment variables, and other critical services
   */
  async checkReadiness(): Promise<HealthStatus> {
    const checks: HealthCheck[] = [];

    // Check database connectivity
    const dbCheck = await this.checkDatabase();
    checks.push(dbCheck);

    // Check Redis connectivity
    const redisCheck = await this.checkRedis();
    checks.push(redisCheck);

    // Check environment variables
    const envCheck = this.checkEnvironmentVariables();
    checks.push(envCheck);

    // Determine overall health
    const isHealthy = checks.every((check) => check.status === 'healthy');

    if (!isHealthy) {
      this.logger.error('Readiness check failed', {
        checks: checks.filter(c => c.status === 'unhealthy'),
        timestamp: new Date().toISOString(),
      });
    }

    return {
      isHealthy,
      checks,
    };
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Simple query to check if database is reachable
      await this.prisma.$queryRaw`SELECT 1`;

      const responseTime = Date.now() - startTime;

      return {
        name: 'database',
        status: 'healthy',
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.logger.error('Database health check failed', error);

      return {
        name: 'database',
        status: 'unhealthy',
        responseTime,
        error: error.message,
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  private async checkRedis(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Connect if not already connected
      if (this.redisClient.status !== 'ready') {
        await this.redisClient.connect();
      }

      // Simple PING command to check if Redis is reachable
      const response = await this.redisClient.ping();

      const responseTime = Date.now() - startTime;

      if (response !== 'PONG') {
        throw new Error(`Unexpected Redis response: ${response}`);
      }

      return {
        name: 'redis',
        status: 'healthy',
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.logger.error('Redis health check failed', error);

      return {
        name: 'redis',
        status: 'unhealthy',
        responseTime,
        error: error.message,
      };
    }
  }

  /**
   * Check critical environment variables
   */
  private checkEnvironmentVariables(): Promise<HealthCheck> {
    const startTime = Date.now();
    const missingVars: string[] = [];
    const invalidVars: string[] = [];

    // Critical environment variables that must be set
    const criticalVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'WEB_APP_URL',
      'AI_MAX_TOKENS_CLARIFYING',
      'AI_MAX_TOKENS_COMPREHENSIVE',
    ];

    // Check for missing variables
    for (const varName of criticalVars) {
      const value = this.configService.get<string>(varName);
      if (!value) {
        missingVars.push(varName);
      }
    }

    // Validate AI token budgets
    const clarifyingTokens = this.configService.get<number>('AI_MAX_TOKENS_CLARIFYING');
    const comprehensiveTokens = this.configService.get<number>('AI_MAX_TOKENS_COMPREHENSIVE');

    if (clarifyingTokens && clarifyingTokens < 100) {
      invalidVars.push('AI_MAX_TOKENS_CLARIFYING (must be >= 100)');
    }

    if (comprehensiveTokens && comprehensiveTokens < 1000) {
      invalidVars.push('AI_MAX_TOKENS_COMPREHENSIVE (must be >= 1000)');
    }

    const responseTime = Date.now() - startTime;

    if (missingVars.length > 0 || invalidVars.length > 0) {
      const errorMessage = [
        missingVars.length > 0 ? `Missing: ${missingVars.join(', ')}` : null,
        invalidVars.length > 0 ? `Invalid: ${invalidVars.join(', ')}` : null,
      ]
        .filter(Boolean)
        .join('; ');

      this.logger.error('Environment variables health check failed', {
        missing: missingVars,
        invalid: invalidVars,
      });

      return Promise.resolve({
        name: 'environment',
        status: 'unhealthy',
        responseTime,
        error: errorMessage,
        details: {
          missing: missingVars,
          invalid: invalidVars,
        },
      });
    }

    return Promise.resolve({
      name: 'environment',
      status: 'healthy',
      responseTime,
      details: {
        checked: criticalVars.length,
      },
    });
  }

  /**
   * Cleanup Redis connection on module destroy
   */
  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

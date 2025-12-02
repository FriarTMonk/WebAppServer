import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
}

interface HealthStatus {
  isHealthy: boolean;
  checks: HealthCheck[];
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Check readiness of the application
   * Tests database connectivity and other critical services
   */
  async checkReadiness(): Promise<HealthStatus> {
    const checks: HealthCheck[] = [];

    // Check database connectivity
    const dbCheck = await this.checkDatabase();
    checks.push(dbCheck);

    // Determine overall health
    const isHealthy = checks.every((check) => check.status === 'healthy');

    if (!isHealthy) {
      this.logger.warn('Readiness check failed', { checks });
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
}

import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../auth/decorators/public.decorator';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('health')
@SkipThrottle() // Health checks should not be rate limited
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Basic health check - returns 200 OK if service is running
   * Used by load balancers and monitoring systems
   */
  @Get()
  @Public()
  async check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * Readiness probe - checks if service is ready to accept traffic
   * Validates database and critical dependencies
   */
  @Get('ready')
  @Public()
  async readiness() {
    const health = await this.healthService.checkReadiness();
    return {
      status: health.isHealthy ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: health.checks,
    };
  }

  /**
   * Liveness probe - checks if service is alive
   * If this fails, container should be restarted
   */
  @Get('live')
  @Public()
  async liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      pid: process.pid,
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
    };
  }
}

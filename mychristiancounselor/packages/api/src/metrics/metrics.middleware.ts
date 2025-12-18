import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // Capture response finish event
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      // Only count 5xx server errors as errors (not 4xx client errors like 401/403/404)
      const isError = res.statusCode >= 500;

      this.metricsService.recordRequest(responseTime, isError);
    });

    next();
  }
}

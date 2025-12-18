import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private startTime: Date;
  private totalRequests = 0;
  private totalResponseTime = 0;
  private errorCount = 0;
  private requestTimestamps: number[] = [];

  constructor() {
    this.startTime = new Date();
    this.logger.log('Metrics service initialized');
  }

  recordRequest(responseTimeMs: number, isError: boolean = false): void {
    this.totalRequests++;
    this.totalResponseTime += responseTimeMs;

    if (isError) {
      this.errorCount++;
    }

    // Track request timestamp for RPM calculation
    const now = Date.now();
    this.requestTimestamps.push(now);

    // Keep only last 5 minutes of timestamps for RPM calculation
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > fiveMinutesAgo);
  }

  getMetrics() {
    const now = Date.now();
    const uptimeMs = now - this.startTime.getTime();
    const uptimeSeconds = Math.floor(uptimeMs / 1000);

    // Calculate uptime percentage (assume target is 99.9% SLA over 30 days)
    // For simplicity, we'll show 100% if no errors, otherwise calculate based on error rate
    const uptimePercentage = this.totalRequests > 0
      ? ((this.totalRequests - this.errorCount) / this.totalRequests) * 100
      : 100;

    // Calculate average response time
    const avgResponseTimeMs = this.totalRequests > 0
      ? Math.round(this.totalResponseTime / this.totalRequests)
      : 0;

    // Calculate requests per minute (based on last 5 minutes)
    const requestsInLastMinute = this.requestTimestamps.filter(
      ts => ts > (now - 60000)
    ).length;

    // Calculate error rate
    const errorRate = this.totalRequests > 0
      ? (this.errorCount / this.totalRequests) * 100
      : 0;

    return {
      uptimeSeconds,
      uptimePercentage: Math.round(uptimePercentage * 100) / 100,
      avgResponseTimeMs,
      totalRequests: this.totalRequests,
      requestsPerMinute: requestsInLastMinute,
      errorRate: Math.round(errorRate * 100) / 100,
    };
  }

  getStartTime(): Date {
    return this.startTime;
  }

  resetMetrics(): void {
    this.logger.warn('Resetting metrics');
    this.startTime = new Date();
    this.totalRequests = 0;
    this.totalResponseTime = 0;
    this.errorCount = 0;
    this.requestTimestamps = [];
  }
}

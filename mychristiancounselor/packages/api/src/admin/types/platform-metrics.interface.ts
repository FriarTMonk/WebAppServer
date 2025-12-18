export interface PlatformMetrics {
  activeUsers: {
    total: number;
    individual: number;
    organization: number;
  };
  totalUsers: number;
  organizations: {
    total: number;
    trial: number;
    active: number;
    expired: number;
  };
  slaHealth?: {
    breachedResponse: number;
    breachedResolution: number;
    criticalResponse: number;
    criticalResolution: number;
    complianceRate: {
      overall: number;
      response: number;
      resolution: number;
    };
  };
  performance?: {
    uptimeSeconds: number;
    uptimePercentage: number;
    avgResponseTimeMs: number;
    totalRequests: number;
    requestsPerMinute: number;
    errorRate: number;
  };
  timestamp: Date;
}

export type QueueHealthStatus = 'healthy' | 'degraded' | 'critical';

export interface QueueHealthMetrics {
  status: QueueHealthStatus;
  processingRate: number; // jobs per minute
  estimatedTimeToClear: number; // minutes
  failureRate: number; // percentage (0-100)
  message: string;
}

export function calculateQueueHealth(
  queueStatus: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    isPaused: boolean;
  },
  recentCompletedJobs: Array<{ completedAt: Date }>,
  recentFailedJobs: Array<{ failedAt: Date }>
): QueueHealthMetrics {
  // Calculate processing rate (jobs per minute)
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;

  const recentCompleted = recentCompletedJobs.filter(
    (job) => new Date(job.completedAt).getTime() > fiveMinutesAgo
  ).length;

  const processingRate = (recentCompleted / 5); // jobs per minute

  // Calculate estimated time to clear
  const estimatedTimeToClear =
    processingRate > 0 ? Math.ceil(queueStatus.waiting / processingRate) : 0;

  // Calculate 24h failure rate
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const failedLast24h = recentFailedJobs.filter(
    (job) => new Date(job.failedAt).getTime() > oneDayAgo
  ).length;

  const completedLast24h = recentCompletedJobs.filter(
    (job) => new Date(job.completedAt).getTime() > oneDayAgo
  ).length;

  const totalLast24h = failedLast24h + completedLast24h;
  const failureRate = totalLast24h > 0 ? (failedLast24h / totalLast24h) * 100 : 0;

  // Determine health status
  let status: QueueHealthStatus = 'healthy';
  let message = 'Queue is processing normally';

  if (queueStatus.isPaused) {
    status = 'degraded';
    message = 'Queue is paused';
  } else if (failureRate > 15) {
    status = 'critical';
    message = `High failure rate (${failureRate.toFixed(1)}%)`;
  } else if (failureRate > 5 || (queueStatus.waiting > 0 && processingRate === 0)) {
    status = 'degraded';
    message = failureRate > 5
      ? 'Elevated failure rate'
      : 'Queue processing is slow or stalled';
  } else if (queueStatus.active > 0) {
    message = `Processing ${queueStatus.active} jobs`;
  }

  return {
    status,
    processingRate,
    estimatedTimeToClear,
    failureRate,
    message,
  };
}

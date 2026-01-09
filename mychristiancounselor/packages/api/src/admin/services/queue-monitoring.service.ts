import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';

@Injectable()
export class QueueMonitoringService {
  constructor(
    @InjectQueue('book-evaluation') private evaluationQueue: Queue,
  ) {}

  async getJobs(status?: string) {
    const validStatuses = ['waiting', 'active', 'completed', 'failed', 'delayed'];

    if (status && !validStatuses.includes(status)) {
      return [];
    }

    const jobs: Job[] = [];

    if (!status || status === 'waiting') {
      jobs.push(...(await this.evaluationQueue.getWaiting()));
    }
    if (!status || status === 'active') {
      jobs.push(...(await this.evaluationQueue.getActive()));
    }
    if (!status || status === 'completed') {
      jobs.push(...(await this.evaluationQueue.getCompleted(0, 99)));
    }
    if (!status || status === 'failed') {
      jobs.push(...(await this.evaluationQueue.getFailed(0, 99)));
    }
    if (!status || status === 'delayed') {
      jobs.push(...(await this.evaluationQueue.getDelayed(0, 99)));
    }

    return Promise.all(jobs.map(async (job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      state: await job.getState(),
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
    })));
  }

  async retryJob(jobId: string) {
    const job = await this.evaluationQueue.getJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }
    await job.retry();
    return { success: true, message: 'Job retried' };
  }

  async removeJob(jobId: string) {
    const job = await this.evaluationQueue.getJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }
    await job.remove();
    return { success: true, message: 'Job removed' };
  }

  async pauseQueue() {
    await this.evaluationQueue.pause();
    return { success: true, message: 'Queue paused' };
  }

  async resumeQueue() {
    await this.evaluationQueue.resume();
    return { success: true, message: 'Queue resumed' };
  }

  async getQueueStatus() {
    const isPaused = await this.evaluationQueue.isPaused();
    const counts = await this.evaluationQueue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
    );

    return {
      isPaused,
      counts,
    };
  }
}

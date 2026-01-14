'use client';

import { useEffect, useRef } from 'react';
import { BrowserNotifications } from '@/components/notifications/BrowserNotifications';

interface QueueStatus {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  isPaused: boolean;
}

export function useQueueNotifications(
  queueStatus: QueueStatus | null,
  enabled: boolean = true
) {
  const previousStatus = useRef<QueueStatus | null>(null);
  const failureTimestamps = useRef<number[]>([]);
  const lastActiveTimestamp = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled || !queueStatus || !previousStatus.current) {
      previousStatus.current = queueStatus;
      return;
    }

    const prev = previousStatus.current;
    const current = queueStatus;

    // 1. Check for failure spike (>10 failed jobs in 5 minutes)
    if (current.failed > prev.failed) {
      const now = Date.now();
      const newFailures = current.failed - prev.failed;

      // Add timestamps for new failures
      for (let i = 0; i < newFailures; i++) {
        failureTimestamps.current.push(now);
      }

      // Remove timestamps older than 5 minutes
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      failureTimestamps.current = failureTimestamps.current.filter(
        (timestamp) => timestamp > fiveMinutesAgo
      );

      // Check if we have 10+ failures in last 5 minutes
      if (failureTimestamps.current.length >= 10) {
        BrowserNotifications.sendQueueAlert('failure_spike', {
          count: failureTimestamps.current.length,
        });
        // Clear to avoid repeated notifications
        failureTimestamps.current = [];
      }
    }

    // 2. Check for stalled queue (no active jobs for 15+ minutes with waiting jobs)
    if (current.active > 0) {
      lastActiveTimestamp.current = Date.now();
    } else if (current.waiting > 0 && !current.isPaused) {
      const minutesSinceLastActive = (Date.now() - lastActiveTimestamp.current) / (60 * 1000);
      if (minutesSinceLastActive >= 15 && prev.active === 0) {
        // Only alert once when crossing threshold
        BrowserNotifications.sendQueueAlert('stalled', {
          waiting: current.waiting,
          minutesStalled: Math.floor(minutesSinceLastActive),
        });
      }
    }

    // 3. Check for queue manually paused
    if (current.isPaused && !prev.isPaused) {
      BrowserNotifications.sendQueueAlert('paused', {
        adminName: 'Another Admin',
      });
    }

    previousStatus.current = current;
  }, [queueStatus, enabled]);
}

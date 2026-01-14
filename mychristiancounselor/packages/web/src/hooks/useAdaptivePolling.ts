'use client';

import { useEffect, useRef, useState } from 'react';

interface UseAdaptivePollingOptions {
  onPoll: () => void | Promise<void>;
  baseInterval: number; // milliseconds
  activeInterval?: number; // interval when tab is active (default: baseInterval)
  inactiveInterval?: number; // interval when tab is inactive (default: baseInterval * 2)
  enabled?: boolean;
}

export function useAdaptivePolling({
  onPoll,
  baseInterval,
  activeInterval = baseInterval,
  inactiveInterval = baseInterval * 2,
  enabled = true,
}: UseAdaptivePollingOptions) {
  const [isTabActive, setIsTabActive] = useState(!document.hidden);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPollTimeRef = useRef<number>(Date.now());

  // Track tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Adaptive polling
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const currentInterval = isTabActive ? activeInterval : inactiveInterval;

    const poll = async () => {
      lastPollTimeRef.current = Date.now();
      await onPoll();
    };

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set new interval
    intervalRef.current = setInterval(poll, currentInterval);

    // Poll immediately on mount or interval change
    poll();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, isTabActive, activeInterval, inactiveInterval, onPoll]);

  return {
    isTabActive,
    lastPollTime: lastPollTimeRef.current,
  };
}

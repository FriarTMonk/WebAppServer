'use client';

import React from 'react';
import { SimpleTour } from './SimpleTour';
import { useTour } from '../contexts/TourContext';

/**
 * TourRunner Component
 *
 * Unix Principles:
 * - Single responsibility: Renders and controls the tour UI
 * - Separation of concerns: Tour state managed in TourContext
 * - Simple: Uses custom SimpleTour component (no external dependencies)
 */
export function TourRunner() {
  const { isTourRunning, tourSteps, stopTour } = useTour();

  return (
    <SimpleTour
      steps={tourSteps}
      isRunning={isTourRunning}
      onComplete={stopTour}
    />
  );
}

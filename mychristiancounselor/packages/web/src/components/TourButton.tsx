'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useTour } from '../contexts/TourContext';
import { getTourForPage, getPageName } from '../config/tours';

export function TourButton() {
  const pathname = usePathname();
  const { startTour } = useTour();

  const handleStartTour = () => {
    const tour = getTourForPage(pathname);
    if (tour) {
      startTour(tour.tourId, tour.steps);
    }
  };

  const tour = getTourForPage(pathname);
  if (!tour) return null;

  const pageName = getPageName(tour.tourId);

  return (
    <button
      onClick={handleStartTour}
      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
      title={`Start ${pageName} Tour`}
    >
      <span>📖</span>
      <span>Page Tour</span>
    </button>
  );
}

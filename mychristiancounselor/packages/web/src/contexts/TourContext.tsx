'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { apiPost, apiDelete, apiGet } from '../lib/api';
import { useAuth } from './AuthContext';

interface TourStep {
  target: string;
  content: string;
  title?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface TourContextValue {
  // Current tour state
  isTourRunning: boolean;
  currentTourId: string | null;
  completedTours: string[];

  // Tour control methods
  startTour: (tourId: string, steps: TourStep[]) => void;
  stopTour: () => void;
  resetTour: (tourId: string) => Promise<void>;

  // Tour steps
  tourSteps: TourStep[];
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

export function TourProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [isTourRunning, setIsTourRunning] = useState(false);
  const [currentTourId, setCurrentTourId] = useState<string | null>(null);
  const [tourSteps, setTourSteps] = useState<TourStep[]>([]);
  const [completedTours, setCompletedTours] = useState<string[]>([]);

  // Load completed tours on mount
  React.useEffect(() => {
    if (isAuthenticated && user) {
      loadCompletedTours();
    }
  }, [isAuthenticated, user]);

  const loadCompletedTours = async () => {
    try {
      const response = await apiGet('/profile/tours/completed');
      if (response.ok) {
        const tours = await response.json();
        setCompletedTours(Array.isArray(tours) ? tours : []);
      }
    } catch (error) {
      console.error('Failed to load completed tours:', error);
    }
  };

  const startTour = useCallback((tourId: string, steps: TourStep[]) => {
    setCurrentTourId(tourId);
    setTourSteps(steps);
    setIsTourRunning(true);
  }, []);

  const stopTour = useCallback(async () => {
    // Mark tour as completed if authenticated
    if (currentTourId && isAuthenticated) {
      try {
        const response = await apiPost(`/profile/tours/${currentTourId}/complete`);
        if (response.ok) {
          const data = await response.json();
          setCompletedTours(data.completedTours || []);
        }
      } catch (error) {
        console.error('Failed to mark tour as completed:', error);
      }
    }

    setIsTourRunning(false);
    setCurrentTourId(null);
    setTourSteps([]);
  }, [currentTourId, isAuthenticated]);

  const resetTour = useCallback(async (tourId: string) => {
    try {
      const response = await apiDelete(`/profile/tours/${tourId}`);
      if (response.ok) {
        const data = await response.json();
        setCompletedTours(data.completedTours || []);
      }
    } catch (error) {
      console.error('Failed to reset tour:', error);
    }
  }, []);

  return (
    <TourContext.Provider
      value={{
        isTourRunning,
        currentTourId,
        completedTours,
        startTour,
        stopTour,
        resetTour,
        tourSteps,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}

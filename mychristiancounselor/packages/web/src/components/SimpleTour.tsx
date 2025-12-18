'use client';

import React, { useState, useEffect, useRef } from 'react';
import '../app/tour.css';

interface TourStep {
  target: string;
  content: string;
  title?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface SimpleTourProps {
  steps: TourStep[];
  isRunning: boolean;
  onComplete: () => void;
}

/**
 * SimpleTour Component - Pure Popup Pattern
 *
 * Follows the classic popup pattern with CSS classes and visibility toggling
 */
export function SimpleTour({ steps, isRunning, onComplete }: SimpleTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const popupRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isRunning || steps.length === 0) {
      // Hide popup and arrow
      if (popupRef.current) {
        popupRef.current.classList.remove('show');
      }
      if (arrowRef.current) {
        arrowRef.current.style.display = 'none';
      }
      return;
    }

    // Show popup
    if (popupRef.current) {
      popupRef.current.classList.add('show');
    }

    const step = steps[currentStep];
    if (!step) return;

    let element: HTMLElement | null = null;
    let retryCount = 0;
    const maxRetries = 20; // Try for up to 2 seconds (20 * 100ms)

    // Function to find and highlight element with retries
    const findAndHighlightElement = () => {
      element = document.querySelector(step.target) as HTMLElement;

      if (!element && retryCount < maxRetries) {
        // Element not found yet, retry
        retryCount++;
        setTimeout(findAndHighlightElement, 100);
        return;
      }

      if (!element) {
        // Element still not found after retries, give up
        console.warn(`Tour element not found: ${step.target}`);
        return;
      }

      // Add highlight class
      element.classList.add('tour-highlight');

      // Position arrow between popup and element
      const positionArrow = () => {
        if (!popupRef.current || !arrowRef.current || !element) return;

        const popupRect = popupRef.current.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        // Calculate center points
        const popupCenterX = popupRect.left + popupRect.width / 2;
        const elementCenterX = elementRect.left + elementRect.width / 2;
        const elementCenterY = elementRect.top + elementRect.height / 2;

        // Calculate arrow position (start from popup bottom)
        const startX = popupCenterX;
        const startY = popupRect.bottom;
        const endX = elementCenterX;
        const endY = elementCenterY;

        // Calculate distance and angle
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI) - 90; // -90 to make it point down

        // Position and style arrow
        arrowRef.current!.style.display = 'block';
        arrowRef.current!.style.left = `${startX}px`;
        arrowRef.current!.style.top = `${startY}px`;
        arrowRef.current!.style.height = `${distance}px`;
        arrowRef.current!.style.transform = `rotate(${angle}deg)`;
      };

      // Position arrow initially and on scroll/resize
      requestAnimationFrame(() => {
        positionArrow();
        window.addEventListener('scroll', positionArrow, true);
        window.addEventListener('resize', positionArrow);
      });
    };

    // Start finding the element
    findAndHighlightElement();

    return () => {
      // Remove highlight class if element was found
      if (element) {
        element.classList.remove('tour-highlight');
      }
      // Remove event listeners
      const positionArrow = () => {}; // Dummy function for cleanup
      window.removeEventListener('scroll', positionArrow, true);
      window.removeEventListener('resize', positionArrow);
    };
  }, [isRunning, currentStep, steps]);

  const step = steps[currentStep];
  if (!step) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <>
      <div ref={arrowRef} className="tour-arrow" style={{ display: 'none' }} />
      <div ref={popupRef} className="tour-popup">
        {step.title && (
          <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 600 }}>
            {step.title}
          </h3>
        )}

        <p style={{ margin: '0 0 20px 0', fontSize: '14px', lineHeight: '1.5', color: '#374151' }}>
          {step.content}
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#6B7280' }}>
            Step {currentStep + 1} of {steps.length}
          </span>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSkip}
              style={{
                padding: '8px 16px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Skip
            </button>

            {currentStep > 0 && (
              <button
                onClick={handleBack}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Back
              </button>
            )}

            <button
              onClick={handleNext}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: '#2563EB',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {currentStep < steps.length - 1 ? 'Next' : 'Finish'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

'use client';

import React, { useState } from 'react';
import { PlanModal } from './PlanModal';

export type PlanType = 'free' | 'premium' | 'organization' | 'comparison';

export function PlansMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);

  const handlePlanSelect = (plan: PlanType) => {
    setSelectedPlan(plan);
    setIsOpen(false);
  };

  const closePlanModal = () => {
    setSelectedPlan(null);
  };

  return (
    <>
      {/* Plans Dropdown Button */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Plans
          <svg
            className="inline-block w-4 h-4 ml-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 z-20 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
              <div className="py-1">
                <button
                  onClick={() => handlePlanSelect('free')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Registered User
                </button>
                <button
                  onClick={() => handlePlanSelect('premium')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Premium Subscriber
                </button>
                <button
                  onClick={() => handlePlanSelect('organization')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Organization
                </button>
                <hr className="my-1" />
                <button
                  onClick={() => handlePlanSelect('comparison')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 font-medium"
                >
                  Compare All Plans
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Plan Modals */}
      {selectedPlan && (
        <PlanModal planType={selectedPlan} onClose={closePlanModal} />
      )}
    </>
  );
}

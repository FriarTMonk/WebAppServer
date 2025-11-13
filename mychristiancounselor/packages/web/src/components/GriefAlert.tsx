'use client';

import React from 'react';
import { GriefResource } from '@mychristiancounselor/shared';

interface GriefAlertProps {
  resources: GriefResource[];
}

export function GriefAlert({ resources }: GriefAlertProps) {
  return (
    <div className="my-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-sm">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-6 w-6 text-yellow-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">
            Grief Support Resources
          </h3>
          <p className="text-sm text-yellow-700 mb-3">
            I'm deeply sorry for what you're going through. While I'm here to provide spiritual guidance,
            these faith-based resources can offer additional support during this difficult time:
          </p>
          <div className="space-y-3">
            {resources.map((resource, index) => (
              <div
                key={index}
                className="bg-white bg-opacity-50 rounded-lg p-3 border border-yellow-200"
              >
                <div className="font-semibold text-yellow-900 text-sm mb-1">
                  {resource.name}
                </div>
                <div className="text-yellow-800 text-sm font-medium mb-1">
                  {resource.contact}
                </div>
                <div className="text-yellow-700 text-sm">
                  {resource.description}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-yellow-700 mt-3 italic">
            "The Lord is close to the brokenhearted and saves those who are crushed in spirit." - Psalm 34:18
          </p>
        </div>
      </div>
    </div>
  );
}

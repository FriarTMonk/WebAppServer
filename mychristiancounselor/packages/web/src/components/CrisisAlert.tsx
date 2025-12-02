'use client';

import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { CrisisResource } from '@mychristiancounselor/shared';

interface CrisisAlertProps {
  resources: CrisisResource[];
}

/**
 * Inline crisis alert component for displaying crisis resources
 * Used in conversation history and journal views
 */
export function CrisisAlert({ resources }: CrisisAlertProps) {
  return (
    <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-semibold text-red-900 mb-2">
            Crisis Support Resources
          </h3>
          <p className="text-sm text-red-800 mb-3">
            If you're in crisis, please reach out to these resources immediately. Your safety is paramount.
          </p>
          <div className="space-y-3">
            {resources.map((resource, index) => (
              <div
                key={index}
                className="bg-white rounded-md p-3 border border-red-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-red-900">
                      {resource.name}
                    </h4>
                    <p className="text-sm text-gray-700 mt-1">{resource.description}</p>
                    <div className="mt-2 space-y-1">
                      {resource.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-gray-700">Phone:</span>
                          <a
                            href={`tel:${resource.phone}`}
                            className="text-red-600 hover:text-red-700 font-semibold"
                          >
                            {resource.phone}
                          </a>
                        </div>
                      )}
                      {resource.text && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-gray-700">Text:</span>
                          <span className="text-red-600 font-semibold">{resource.text}</span>
                        </div>
                      )}
                      {resource.website && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-gray-700">Website:</span>
                          <a
                            href={resource.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-600 hover:text-red-700 underline"
                          >
                            {resource.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

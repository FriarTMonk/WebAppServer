import React from 'react';
import { CrisisResource } from '@mychrisiancounselor/shared';

interface CrisisModalProps {
  isOpen: boolean;
  resources: CrisisResource[];
  onClose: () => void;
}

export function CrisisModal({ isOpen, resources, onClose }: CrisisModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-red-600 mb-4">
          Immediate Help Available
        </h2>

        <p className="text-gray-700 mb-6">
          We're concerned about what you've shared. Please reach out to these professional resources who can provide immediate support:
        </p>

        <div className="space-y-4 mb-6">
          {resources.map((resource, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-bold text-lg text-gray-900">{resource.name}</h3>
              <p className="text-xl font-semibold text-primary-600 my-2">
                {resource.contact}
              </p>
              <p className="text-gray-600">{resource.description}</p>
            </div>
          ))}
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-900 font-semibold">
            If you're in immediate danger, please call 911 or go to your nearest emergency room.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full btn-primary"
        >
          I Understand
        </button>
      </div>
    </div>
  );
}

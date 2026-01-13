'use client';

import { ActionType, ActionConfig } from '../types';
import { ACTION_TYPES } from '../constants';

interface ActionFormFieldsProps {
  actionType: ActionType;
  action: ActionConfig;
  onChange: (action: ActionConfig) => void;
}

export function ActionFormFields({
  actionType,
  action,
  onChange,
}: ActionFormFieldsProps) {
  const handleFieldChange = (fieldName: string, value: any) => {
    onChange({
      ...action,
      [fieldName]: value,
    });
  };

  return (
    <div className="space-y-4">
      {actionType.fields.map((field) => {
        switch (field.type) {
          case 'text':
            return (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label} {field.required && '*'}
                </label>
                <input
                  type="text"
                  value={action[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder={field.placeholder}
                  required={field.required}
                />
              </div>
            );

          case 'textarea':
            return (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label} {field.required && '*'}
                </label>
                <textarea
                  value={action[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder={field.placeholder}
                  rows={3}
                  required={field.required}
                />
              </div>
            );

          case 'number':
            return (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label} {field.required && '*'}
                </label>
                <input
                  type="number"
                  value={action[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder={field.placeholder}
                  min={field.min}
                  max={field.max}
                  required={field.required}
                />
              </div>
            );

          case 'select':
            return (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label} {field.required && '*'}
                </label>
                <select
                  value={action[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  required={field.required}
                >
                  <option value="">Select...</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

'use client';

interface Step1BasicInfoProps {
  name: string;
  description: string;
  isActive: boolean;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onActiveChange: (isActive: boolean) => void;
  errors?: { name?: string; description?: string };
}

export function Step1BasicInfo({
  name,
  description,
  isActive,
  onNameChange,
  onDescriptionChange,
  onActiveChange,
  errors = {},
}: Step1BasicInfoProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Step 1: Basic Information</h2>
        <p className="text-sm text-gray-600">
          Provide a name and description for this workflow rule.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Workflow Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className={`w-full px-3 py-2 border rounded-md ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g., High Depression Score Alert"
          maxLength={100}
          required
        />
        {errors.name && (
          <p className="text-xs text-red-600 mt-1">{errors.name}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {name.length}/100 characters
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description (Optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className={`w-full px-3 py-2 border rounded-md ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Describe when this workflow should trigger and what actions it will take..."
          rows={4}
          maxLength={500}
        />
        {errors.description && (
          <p className="text-xs text-red-600 mt-1">{errors.description}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          {description.length}/500 characters
        </p>
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => onActiveChange(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium text-gray-700">
            Activate workflow immediately after creation
          </span>
        </label>
        <p className="text-xs text-gray-500 mt-1 ml-6">
          Inactive workflows will not trigger, but can be activated later.
        </p>
      </div>
    </div>
  );
}

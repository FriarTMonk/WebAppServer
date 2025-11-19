'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { apiPost } from '../../../lib/api';

interface FormData {
  title: string;
  description: string;
  category: string;
  priority: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
}

export default function CreateTicketPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    category: 'technical',
    priority: 'medium',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/support/new');
    }
  }, [isAuthenticated, router]);

  const categories = [
    { value: 'technical', label: 'Technical Issue' },
    { value: 'account', label: 'Account Help' },
    { value: 'billing', label: 'Billing Question' },
    { value: 'feature_request', label: 'Feature Request' },
    { value: 'license_management', label: 'License Management' },
    { value: 'member_issues', label: 'Member Issues' },
    { value: 'counselor_tools', label: 'Counselor Tools' },
  ];

  const priorities = [
    { value: 'urgent', label: 'Urgent - System is down or completely unusable', description: 'Critical impact requiring immediate attention' },
    { value: 'high', label: 'High - Major functionality is broken', description: 'Significant impact on daily operations' },
    { value: 'medium', label: 'Medium - Minor issues or glitches', description: 'Moderate impact, workaround may exist' },
    { value: 'low', label: 'Low - Cosmetic issues or questions', description: 'Minimal impact on operations' },
    { value: 'feature', label: 'Feature Request - Enhancement or new feature', description: 'Suggestion for improvement' },
  ];

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // Title validation
    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    } else if (formData.title.trim().length < 10) {
      errors.title = 'Title must be at least 10 characters';
    } else if (formData.title.trim().length > 200) {
      errors.title = 'Title must not exceed 200 characters';
    }

    // Description validation
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.trim().length < 50) {
      errors.description = 'Description must be at least 50 characters';
    } else if (formData.description.trim().length > 5000) {
      errors.description = 'Description must not exceed 5000 characters';
    }

    // Category validation
    if (!formData.category) {
      errors.category = 'Category is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await apiPost('/support/tickets', formData);
      let data;

      try {
        data = await response.json();
      } catch (parseError) {
        setError('Server error. Please try again.');
        setLoading(false);
        return;
      }

      if (response.ok) {
        setLoading(false);
        router.push(`/support/tickets/${data.id}`);
      } else {
        setError(data.message || 'Failed to create ticket');
        setLoading(false);
      }
    } catch (err: unknown) {
      console.error('Error creating ticket:', err);
      const message = err instanceof Error ? err.message : 'Failed to create ticket. Please try again.';
      setError(message);
      setLoading(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    setError(''); // Clear global error when user makes changes
    // Clear field-specific error
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: undefined });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Redirecting to login...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            ← Back
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Support Ticket</h1>
          <p className="text-gray-600 mb-6">
            Please provide as much detail as possible to help us assist you quickly.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Brief summary of your issue"
                disabled={loading}
              />
              <div className="flex justify-between items-center mt-1">
                {formErrors.title ? (
                  <p className="text-sm text-red-600">{formErrors.title}</p>
                ) : (
                  <p className="text-sm text-gray-500">Minimum 10 characters</p>
                )}
                <p className={`text-sm ${formData.title.trim().length > 200 ? 'text-red-600' : 'text-gray-500'}`}>
                  {formData.title.trim().length}/200
                </p>
              </div>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.category ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={loading}
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {formErrors.category && (
                <p className="text-sm text-red-600 mt-1">{formErrors.category}</p>
              )}
            </div>

            {/* Priority */}
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                {priorities.map((pri) => (
                  <option key={pri.value} value={pri.value}>
                    {pri.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                {priorities.find((p) => p.value === formData.priority)?.description}
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                rows={10}
                placeholder="Please provide a detailed description of your issue. Include:&#10;- What you were trying to do&#10;- What happened instead&#10;- Any error messages you saw&#10;- Steps to reproduce the issue"
                disabled={loading}
              />
              <div className="flex justify-between items-center mt-1">
                {formErrors.description ? (
                  <p className="text-sm text-red-600">{formErrors.description}</p>
                ) : (
                  <p className="text-sm text-gray-500">Minimum 50 characters - Please be as detailed as possible</p>
                )}
                <p className={`text-sm ${formData.description.trim().length > 5000 ? 'text-red-600' : 'text-gray-500'}`}>
                  {formData.description.trim().length}/5000
                </p>
              </div>
            </div>

            {/* Help text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Tips for a great support ticket:</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Be specific about what you were trying to accomplish</li>
                <li>Include any error messages or unexpected behavior</li>
                <li>Mention which browser or device you're using</li>
                <li>If possible, include steps to reproduce the issue</li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Ticket'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

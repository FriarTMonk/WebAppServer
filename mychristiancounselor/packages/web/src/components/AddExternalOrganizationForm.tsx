'use client';

import { useState } from 'react';
import { apiPost, apiPut } from '@/lib/api';
import { showToast } from './Toast';

interface ExternalOrgFormData {
  name: string;
  organizationTypes: string[];
  specialtyTags: string[];
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  hours: string;
  recommendationNote: string;
}

interface AddExternalOrganizationFormProps {
  onClose: () => void;
  onSuccess: () => void;
  editingOrg?: {
    id: string;
  } & ExternalOrgFormData;
}

const ORGANIZATION_TYPES = [
  'Church',
  'Counseling Center',
  'Crisis Hotline',
  'Support Group',
  'Medical Facility',
  'Legal Services',
  'Housing Services',
  'Food Bank',
  'Other'
];

const SPECIALTY_TAGS = [
  'Pastoral Care',
  'Grief Counseling',
  'Addiction Counseling',
  'Abuse Counseling',
  'Marriage Counseling',
  'Family Counseling',
  'Teen Counseling',
  'Crisis Intervention',
  'Mental Health',
  'Financial Counseling',
  'Legal Aid',
  'Medical Services',
  'Housing Assistance',
  'Food Assistance'
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export function AddExternalOrganizationForm({ onClose, onSuccess, editingOrg }: AddExternalOrganizationFormProps) {
  const isEditing = !!editingOrg;
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<ExternalOrgFormData>({
    name: editingOrg?.name || '',
    organizationTypes: editingOrg?.organizationTypes || [],
    specialtyTags: editingOrg?.specialtyTags || [],
    street: editingOrg?.street || '',
    city: editingOrg?.city || '',
    state: editingOrg?.state || '',
    zipCode: editingOrg?.zipCode || '',
    country: editingOrg?.country || 'USA',
    phone: editingOrg?.phone || '',
    email: editingOrg?.email || '',
    website: editingOrg?.website || '',
    hours: editingOrg?.hours || '',
    recommendationNote: editingOrg?.recommendationNote || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Organization name is required';
    if (formData.organizationTypes.length === 0) newErrors.organizationTypes = 'At least one organization type is required';
    if (formData.specialtyTags.length === 0) newErrors.specialtyTags = 'At least one specialty tag is required';
    if (!formData.street.trim()) newErrors.street = 'Street address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state) newErrors.state = 'State is required';
    if (!formData.zipCode.trim()) newErrors.zipCode = 'ZIP code is required';
    if (!formData.recommendationNote.trim()) newErrors.recommendationNote = 'Recommendation note is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const response = isEditing
        ? await apiPut(`/resources/organizations/external/${editingOrg.id}`, formData)
        : await apiPost('/resources/organizations/external', formData);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save organization');
      }

      showToast(`External organization ${isEditing ? 'updated' : 'added'} successfully`, 'success');
      onSuccess();
    } catch (error) {
      console.error('Error with external organization:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save external organization', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleArrayField = (field: 'organizationTypes' | 'specialtyTags', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-3xl w-full my-8">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-lg z-10">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? 'Edit External Organization' : 'Add External Organization'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={submitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              disabled={submitting}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Types <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {ORGANIZATION_TYPES.map(type => (
                <label key={type} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.organizationTypes.includes(type)}
                    onChange={() => toggleArrayField('organizationTypes', type)}
                    className="rounded border-gray-300"
                    disabled={submitting}
                  />
                  <span className="text-sm text-gray-700">{type}</span>
                </label>
              ))}
            </div>
            {errors.organizationTypes && <p className="text-red-500 text-sm mt-1">{errors.organizationTypes}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Services Provided <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {SPECIALTY_TAGS.map(tag => (
                <label key={tag} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.specialtyTags.includes(tag)}
                    onChange={() => toggleArrayField('specialtyTags', tag)}
                    className="rounded border-gray-300"
                    disabled={submitting}
                  />
                  <span className="text-sm text-gray-700">{tag}</span>
                </label>
              ))}
            </div>
            {errors.specialtyTags && <p className="text-red-500 text-sm mt-1">{errors.specialtyTags}</p>}
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md ${errors.street ? 'border-red-500' : 'border-gray-300'}`}
                  disabled={submitting}
                />
                {errors.street && <p className="text-red-500 text-sm mt-1">{errors.street}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md ${errors.city ? 'border-red-500' : 'border-gray-300'}`}
                    disabled={submitting}
                  />
                  {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md ${errors.state ? 'border-red-500' : 'border-gray-300'}`}
                    disabled={submitting}
                  >
                    <option value="">Select State</option>
                    {US_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md ${errors.zipCode ? 'border-red-500' : 'border-gray-300'}`}
                    disabled={submitting}
                  />
                  {errors.zipCode && <p className="text-red-500 text-sm mt-1">{errors.zipCode}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="https://example.com"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hours of Operation</label>
                <textarea
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Mon-Fri 9AM-5PM"
                  disabled={submitting}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Why do you recommend this organization? <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.recommendationNote}
              onChange={(e) => setFormData({ ...formData, recommendationNote: e.target.value })}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md ${errors.recommendationNote ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Describe why this organization would be helpful for your members..."
              disabled={submitting}
            />
            {errors.recommendationNote && <p className="text-red-500 text-sm mt-1">{errors.recommendationNote}</p>}
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              disabled={submitting}
            >
              {submitting ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Organization' : 'Add Organization')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

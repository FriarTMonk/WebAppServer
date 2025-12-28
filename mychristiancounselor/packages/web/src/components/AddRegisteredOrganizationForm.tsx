'use client';

import { useState } from 'react';
import { apiPost, apiPatch } from '@/lib/api';
import { showToast } from './Toast';

interface RegisteredOrgFormData {
  name: string;
  description: string;
  ownerEmail: string;
  licenseType: string;
  licenseStatus: string;
  maxMembers: number;
  specialtyTags: string[];
  website: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface AddRegisteredOrganizationFormProps {
  onClose: () => void;
  onSuccess: () => void;
  editingOrg?: {
    id: string;
  } & RegisteredOrgFormData;
}

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

const LICENSE_TYPES = ['Family', 'Small', 'Medium', 'Large'];
const LICENSE_STATUSES = ['trial', 'active', 'expired', 'cancelled'];

export function AddRegisteredOrganizationForm({ onClose, onSuccess, editingOrg }: AddRegisteredOrganizationFormProps) {
  const isEditing = !!editingOrg;
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<RegisteredOrgFormData>({
    name: editingOrg?.name || '',
    description: editingOrg?.description || '',
    ownerEmail: editingOrg?.ownerEmail || '',
    licenseType: editingOrg?.licenseType || '',
    licenseStatus: editingOrg?.licenseStatus || 'trial',
    maxMembers: editingOrg?.maxMembers || 10,
    specialtyTags: editingOrg?.specialtyTags || [],
    website: editingOrg?.website || '',
    street: editingOrg?.street || '',
    city: editingOrg?.city || '',
    state: editingOrg?.state || '',
    zipCode: editingOrg?.zipCode || '',
    country: editingOrg?.country || 'USA',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Organization name is required';

    // Only require ownerEmail when creating (not editing)
    if (!isEditing && !formData.ownerEmail.trim()) newErrors.ownerEmail = 'Owner email is required';

    // When creating, require specialtyTags and address fields
    // When editing, these are optional (for legacy organizations)
    if (!isEditing) {
      if (formData.specialtyTags.length === 0) newErrors.specialtyTags = 'At least one service type is required';
      if (!formData.street.trim()) newErrors.street = 'Street address is required';
      if (!formData.city.trim()) newErrors.city = 'City is required';
      if (!formData.state) newErrors.state = 'State is required';
      if (!formData.zipCode.trim()) newErrors.zipCode = 'ZIP code is required';
    }

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
      // Prepare data - exclude ownerEmail when editing
      const submitData = isEditing
        ? {
            name: formData.name,
            description: formData.description,
            licenseType: formData.licenseType,
            licenseStatus: formData.licenseStatus,
            maxMembers: formData.maxMembers,
            specialtyTags: formData.specialtyTags,
            website: formData.website,
            street: formData.street,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode,
            country: formData.country,
          }
        : formData;

      const response = isEditing
        ? await apiPatch(`/admin/organizations/${editingOrg.id}`, submitData)
        : await apiPost('/admin/organizations', submitData);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save organization');
      }

      showToast(`Organization ${isEditing ? 'updated' : 'created'} successfully`, 'success');
      onSuccess();
    } catch (error) {
      console.error('Error with organization:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save organization', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSpecialtyTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      specialtyTags: prev.specialtyTags.includes(tag)
        ? prev.specialtyTags.filter(t => t !== tag)
        : [...prev.specialtyTags, tag]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-3xl w-full my-8">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-lg z-10">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? 'Edit Organization' : 'Add Registered Organization'}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Brief description of the organization..."
              disabled={submitting}
            />
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Client/License Information</h3>

            <div className="space-y-4">
              {!isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Owner Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md ${errors.ownerEmail ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="owner@example.com"
                    disabled={submitting}
                  />
                  {errors.ownerEmail && <p className="text-red-500 text-sm mt-1">{errors.ownerEmail}</p>}
                  <p className="mt-1 text-sm text-gray-500">
                    This person will be able to manage the organization. If they don't have an account, they'll receive an invitation.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Type
                  </label>
                  <select
                    value={formData.licenseType}
                    onChange={(e) => setFormData({ ...formData, licenseType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={submitting}
                  >
                    <option value="">Select Type</option>
                    {LICENSE_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Status
                  </label>
                  <select
                    value={formData.licenseStatus}
                    onChange={(e) => setFormData({ ...formData, licenseStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={submitting}
                  >
                    {LICENSE_STATUSES.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Members
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxMembers}
                    onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) || 10 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resource/Browse Information</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Services Provided {!isEditing && <span className="text-red-500">*</span>}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {SPECIALTY_TAGS.map(tag => (
                  <label key={tag} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.specialtyTags.includes(tag)}
                      onChange={() => toggleSpecialtyTag(tag)}
                      className="rounded border-gray-300"
                      disabled={submitting}
                    />
                    <span className="text-sm text-gray-700">{tag}</span>
                  </label>
                ))}
              </div>
              {errors.specialtyTags && <p className="text-red-500 text-sm mt-1">{errors.specialtyTags}</p>}
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

            <div className="space-y-4 mt-4">
              <h4 className="text-md font-semibold text-gray-900">Address</h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address {!isEditing && <span className="text-red-500">*</span>}
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
                    City {!isEditing && <span className="text-red-500">*</span>}
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
                    State {!isEditing && <span className="text-red-500">*</span>}
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
                    ZIP Code {!isEditing && <span className="text-red-500">*</span>}
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
              {submitting ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Organization' : 'Create Organization')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

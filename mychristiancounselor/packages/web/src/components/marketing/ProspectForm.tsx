'use client';

import { useState } from 'react';
import { apiPost, apiPatch } from '@/lib/api';
import { showToast } from '../Toast';

interface ProspectContact {
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
  isPrimary: boolean;
}

interface ProspectFormData {
  organizationName: string;
  website: string | null;
  industry: string | null;
  estimatedSize: string | null;
  notes: string | null;
  contacts: ProspectContact[];
}

interface ProspectFormProps {
  onClose: () => void;
  onSuccess: () => void;
  editingProspect?: {
    id: string;
  } & ProspectFormData;
}

const INDUSTRIES = [
  'Church',
  'Ministry',
  'Counseling Center',
  'Non-Profit',
  'School/University',
  'Healthcare',
  'Other'
];

const ORGANIZATION_SIZES = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '500+ employees'
];

export function ProspectForm({ onClose, onSuccess, editingProspect }: ProspectFormProps) {
  const isEditing = !!editingProspect;
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<ProspectFormData>({
    organizationName: editingProspect?.organizationName || '',
    website: editingProspect?.website || '',
    industry: editingProspect?.industry || '',
    estimatedSize: editingProspect?.estimatedSize || '',
    notes: editingProspect?.notes || '',
    contacts: editingProspect?.contacts || [
      { name: '', email: '', phone: '', title: '', isPrimary: true }
    ],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.organizationName.trim()) {
      newErrors.organizationName = 'Organization name is required';
    }

    if (formData.contacts.length === 0) {
      newErrors.contacts = 'At least one contact is required';
    }

    formData.contacts.forEach((contact, index) => {
      if (!contact.name.trim()) {
        newErrors[`contact_${index}_name`] = 'Contact name is required';
      }
      if (!contact.email.trim()) {
        newErrors[`contact_${index}_email`] = 'Contact email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
        newErrors[`contact_${index}_email`] = 'Invalid email format';
      }
    });

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
        ? await apiPatch(`/marketing/prospects/${editingProspect.id}`, formData)
        : await apiPost('/marketing/prospects', formData);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save prospect');
      }

      showToast(`Prospect ${isEditing ? 'updated' : 'created'} successfully`, 'success');
      onSuccess();
    } catch (error) {
      console.error('Error with prospect:', error);
      showToast(error instanceof Error ? error.message : 'Failed to save prospect', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const addContact = () => {
    setFormData({
      ...formData,
      contacts: [
        ...formData.contacts,
        { name: '', email: '', phone: '', title: '', isPrimary: false }
      ],
    });
  };

  const removeContact = (index: number) => {
    const newContacts = formData.contacts.filter((_, i) => i !== index);
    // If removing the primary contact, make the first contact primary
    if (formData.contacts[index].isPrimary && newContacts.length > 0) {
      newContacts[0].isPrimary = true;
    }
    setFormData({ ...formData, contacts: newContacts });
  };

  const updateContact = (index: number, field: keyof ProspectContact, value: string | boolean) => {
    const newContacts = [...formData.contacts];

    // If setting a contact as primary, unset all others
    if (field === 'isPrimary' && value === true) {
      newContacts.forEach((contact, i) => {
        contact.isPrimary = i === index;
      });
    } else {
      newContacts[index] = { ...newContacts[index], [field]: value };
    }

    setFormData({ ...formData, contacts: newContacts });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-3xl w-full my-8">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-lg z-10">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? 'Edit Prospect' : 'Add New Prospect'}
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
          {/* Organization Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization Information</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.organizationName}
                  onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md ${errors.organizationName ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="First Baptist Church"
                  disabled={submitting}
                />
                {errors.organizationName && <p className="text-red-500 text-sm mt-1">{errors.organizationName}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="https://example.com"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industry
                  </label>
                  <select
                    value={formData.industry || ''}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={submitting}
                  >
                    <option value="">Select Industry</option>
                    {INDUSTRIES.map(industry => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Size
                </label>
                <select
                  value={formData.estimatedSize || ''}
                  onChange={(e) => setFormData({ ...formData, estimatedSize: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={submitting}
                >
                  <option value="">Select Size</option>
                  {ORGANIZATION_SIZES.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Any additional information about this prospect..."
                  disabled={submitting}
                />
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Contacts <span className="text-red-500">*</span>
              </h3>
              <button
                type="button"
                onClick={addContact}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                disabled={submitting}
              >
                + Add Contact
              </button>
            </div>

            {errors.contacts && <p className="text-red-500 text-sm mb-4">{errors.contacts}</p>}

            <div className="space-y-4">
              {formData.contacts.map((contact, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                  {formData.contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContact(index)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                      disabled={submitting}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={contact.isPrimary}
                        onChange={(e) => updateContact(index, 'isPrimary', e.target.checked)}
                        className="rounded"
                        disabled={submitting}
                      />
                      <label className="text-sm font-medium text-gray-700">
                        Primary Contact
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={contact.name}
                          onChange={(e) => updateContact(index, 'name', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md text-sm ${errors[`contact_${index}_name`] ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="John Doe"
                          disabled={submitting}
                        />
                        {errors[`contact_${index}_name`] && <p className="text-red-500 text-xs mt-1">{errors[`contact_${index}_name`]}</p>}
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={contact.email}
                          onChange={(e) => updateContact(index, 'email', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md text-sm ${errors[`contact_${index}_email`] ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="john@example.com"
                          disabled={submitting}
                        />
                        {errors[`contact_${index}_email`] && <p className="text-red-500 text-xs mt-1">{errors[`contact_${index}_email`]}</p>}
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={contact.phone || ''}
                          onChange={(e) => updateContact(index, 'phone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="(555) 123-4567"
                          disabled={submitting}
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Title/Role
                        </label>
                        <input
                          type="text"
                          value={contact.title || ''}
                          onChange={(e) => updateContact(index, 'title', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="Pastor, Director, etc."
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : isEditing ? 'Update Prospect' : 'Add Prospect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

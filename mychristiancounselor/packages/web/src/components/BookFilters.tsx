'use client';

import { useState } from 'react';

interface BookFiltersProps {
  filters: {
    search: string;
    genre: string;
    visibilityTier: string;
    showMatureContent: boolean;
    sort: string;
  };
  onFilterChange: (filters: any) => void;
  showAlignmentFilter?: boolean;
}

export function BookFilters({ filters, onFilterChange, showAlignmentFilter = false }: BookFiltersProps) {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1">
        {/* Search Input */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            value={localFilters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Title, Author, ISBN..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Genre Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Genre
          </label>
          <select
            value={localFilters.genre}
            onChange={(e) => handleFilterChange('genre', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Genres</option>
            <option value="theology">Theology</option>
            <option value="devotional">Devotional</option>
            <option value="fiction">Fiction</option>
            <option value="study">Study</option>
            <option value="biography">Biography</option>
            <option value="commentary">Commentary</option>
          </select>
        </div>

        {/* Alignment Filter (Platform Admin only) */}
        {showAlignmentFilter && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alignment
            </label>
            <select
              value={localFilters.visibilityTier}
              onChange={(e) => handleFilterChange('visibilityTier', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="globally_aligned">Globally Aligned (≥90%)</option>
              <option value="conceptually_aligned">Conceptually Aligned (70-89%)</option>
              <option value="not_aligned">Not Aligned (&lt;70%)</option>
            </select>
          </div>
        )}

        {/* Sort */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sort By
          </label>
          <select
            value={localFilters.sort}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="relevance">Relevance</option>
            <option value="title">Title (A-Z)</option>
            <option value="newest">Newest First</option>
            <option value="score">Highest Score</option>
          </select>
        </div>
      </div>

      {/* Mature Content Checkbox */}
      <div className="mt-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={localFilters.showMatureContent}
            onChange={(e) => handleFilterChange('showMatureContent', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">
            Show books with mature content
          </span>
        </label>
      </div>
    </div>
  );
}

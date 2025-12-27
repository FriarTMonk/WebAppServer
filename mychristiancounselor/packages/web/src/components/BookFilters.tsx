'use client';

import { useState, useEffect } from 'react';
import { BookFilters as BookFiltersType } from '../lib/api';

// Constants for magic strings
const GENRES = [
  { value: 'all', label: 'All Genres' },
  { value: 'theology', label: 'Theology' },
  { value: 'devotional', label: 'Devotional' },
  { value: 'fiction', label: 'Fiction' },
  { value: 'study', label: 'Study' },
  { value: 'biography', label: 'Biography' },
  { value: 'commentary', label: 'Commentary' },
] as const;

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'title', label: 'Title (A-Z)' },
  { value: 'newest', label: 'Newest First' },
  { value: 'score', label: 'Highest Score' },
] as const;

const VISIBILITY_TIERS = [
  { value: 'all', label: 'All Levels' },
  { value: 'globally_aligned', label: 'Globally Aligned (≥90%)' },
  { value: 'conceptually_aligned', label: 'Conceptually Aligned (70-89%)' },
  { value: 'not_aligned', label: 'Not Aligned (<70%)' },
] as const;

const INPUT_CLASSNAME = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';

const SEARCH_DEBOUNCE_MS = 300;

const DEFAULT_FILTERS = {
  search: '',
  genre: 'all',
  visibilityTier: 'all',
  showMatureContent: false,
  sort: 'relevance',
};

interface BookFiltersProps {
  filters?: {
    search: string;
    genre: string;
    visibilityTier: string;
    showMatureContent: boolean;
    sort: string;
  };
  onFilterChange: (filters: BookFiltersType) => void;
  showAlignmentFilter?: boolean;
}

export function BookFilters({ filters, onFilterChange, showAlignmentFilter = false }: BookFiltersProps) {
  const safeFilters = filters || DEFAULT_FILTERS;
  const [localFilters, setLocalFilters] = useState(safeFilters);
  const [searchValue, setSearchValue] = useState(safeFilters.search);

  // Sync localFilters when parent filters prop changes
  useEffect(() => {
    const updatedFilters = filters || DEFAULT_FILTERS;
    setLocalFilters(updatedFilters);
    setSearchValue(updatedFilters.search);
  }, [filters]);

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchValue !== localFilters.search) {
        const newFilters = { ...localFilters, search: searchValue };
        setLocalFilters(newFilters);
        onFilterChange(newFilters);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [searchValue, localFilters, onFilterChange]);

  const handleFilterChange = (key: string, value: string | boolean) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1">
        {/* Search Input */}
        <div className="lg:col-span-2">
          <label htmlFor="book-search" className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            id="book-search"
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Title, Author, ISBN..."
            className={INPUT_CLASSNAME}
          />
        </div>

        {/* Genre Filter */}
        <div>
          <label htmlFor="book-genre" className="block text-sm font-medium text-gray-700 mb-1">
            Genre
          </label>
          <select
            id="book-genre"
            value={localFilters.genre}
            onChange={(e) => handleFilterChange('genre', e.target.value)}
            className={INPUT_CLASSNAME}
          >
            {GENRES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Alignment Filter (Platform Admin only) */}
        {showAlignmentFilter && (
          <div>
            <label htmlFor="book-alignment" className="block text-sm font-medium text-gray-700 mb-1">
              Alignment
            </label>
            <select
              id="book-alignment"
              value={localFilters.visibilityTier}
              onChange={(e) => handleFilterChange('visibilityTier', e.target.value)}
              className={INPUT_CLASSNAME}
            >
              {VISIBILITY_TIERS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Sort */}
        <div>
          <label htmlFor="book-sort" className="block text-sm font-medium text-gray-700 mb-1">
            Sort By
          </label>
          <select
            id="book-sort"
            value={localFilters.sort}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
            className={INPUT_CLASSNAME}
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mature Content Checkbox */}
      <div className="mt-4">
        <label htmlFor="book-mature-content" className="flex items-center">
          <input
            id="book-mature-content"
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

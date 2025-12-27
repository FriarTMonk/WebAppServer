'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserPermissions } from '../../../../hooks/useUserPermissions';
import { bookApi } from '../../../../lib/api';

type LookupMethod = 'auto' | 'manual';
type LicenseType = 'public_domain' | 'creative_commons' | 'publisher_permission' | 'analysis_only';

interface BookMetadata {
  title: string;
  author: string;
  publisher?: string;
  year?: string;
  description?: string;
  coverImageUrl?: string;
}

export default function AddNewBookPage() {
  const router = useRouter();
  const permissions = useUserPermissions();

  // Step state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Lookup method
  const [lookupMethod, setLookupMethod] = useState<LookupMethod>('auto');
  const [lookupInput, setLookupInput] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  // Step 2: Metadata
  const [metadata, setMetadata] = useState<BookMetadata>({
    title: '',
    author: '',
    publisher: '',
    year: '',
    description: '',
    coverImageUrl: '',
  });
  const [metadataErrors, setMetadataErrors] = useState<Record<string, string>>({});

  // Step 3: PDF upload
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [licenseType, setLicenseType] = useState<LicenseType>('analysis_only');
  const [pdfError, setPdfError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Check permissions
  useEffect(() => {
    if (!permissions.canAddBooks) {
      router.push('/resources/books');
    }
  }, [permissions.canAddBooks, router]);

  // Redirect if no permission
  if (!permissions.canAddBooks) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Step 1: Validate ISBN/URL
  const validateLookupInput = (input: string): boolean => {
    if (!input.trim()) {
      setLookupError('Please enter an ISBN or URL');
      return false;
    }

    // ISBN validation (10 or 13 digits, with optional hyphens)
    const isbnPattern = /^(?:\d{9}[\dXx]|\d{13})$/;
    const cleanInput = input.replace(/[-\s]/g, '');

    // URL validation
    const urlPattern = /^https?:\/\/.+/;

    if (!isbnPattern.test(cleanInput) && !urlPattern.test(input)) {
      setLookupError('Please enter a valid ISBN (10 or 13 digits) or URL');
      return false;
    }

    setLookupError('');
    return true;
  };

  const handleAutoLookup = async () => {
    if (!validateLookupInput(lookupInput)) {
      return;
    }

    setLookingUp(true);
    setLookupError('');

    try {
      // TODO: Call auto-lookup API endpoint when available
      // For now, simulate a delay and move to manual entry
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock: Auto-fill some data if ISBN is recognized
      // In production, this would call /api/books/lookup with ISBN/URL
      setMetadata({
        title: '',
        author: '',
        publisher: '',
        year: '',
        description: '',
        coverImageUrl: '',
      });

      setCurrentStep(2);
    } catch (err) {
      setLookupError('Failed to lookup book information. Please try manual entry.');
      console.error('Lookup error:', err);
    } finally {
      setLookingUp(false);
    }
  };

  const handleStep1Continue = () => {
    if (lookupMethod === 'auto') {
      handleAutoLookup();
    } else {
      setCurrentStep(2);
    }
  };

  // Step 2: Validate metadata
  const validateMetadata = (): boolean => {
    const errors: Record<string, string> = {};

    if (!metadata.title.trim()) {
      errors.title = 'Title is required';
    }

    if (!metadata.author.trim()) {
      errors.author = 'Author is required';
    }

    setMetadataErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStep2Back = () => {
    setCurrentStep(1);
  };

  const handleStep2Continue = () => {
    if (validateMetadata()) {
      setCurrentStep(3);
    }
  };

  // Step 3: Handle PDF upload
  const handleFileSelect = (file: File) => {
    setPdfError('');

    // Validate file type
    if (file.type !== 'application/pdf') {
      setPdfError('Please select a PDF file');
      return;
    }

    // Validate file size (100MB max)
    const maxSize = 100 * 1024 * 1024; // 100MB in bytes
    if (file.size > maxSize) {
      setPdfError('PDF file must be under 100MB');
      return;
    }

    setPdfFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleStep3Back = () => {
    setCurrentStep(2);
  };

  const handleSubmit = async (includePdf: boolean) => {
    setSubmitting(true);
    setSubmitError('');

    try {
      // Create book
      const createResponse = await bookApi.create(metadata);

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Failed to create book');
      }

      const bookData = await createResponse.json();
      const bookId = bookData.id;

      // Upload PDF if provided
      if (includePdf && pdfFile) {
        const uploadResponse = await bookApi.uploadPdf(bookId, pdfFile, licenseType);

        if (!uploadResponse.ok) {
          // Book created but PDF upload failed
          console.error('PDF upload failed');
          setSubmitError('Book created, but PDF upload failed. You can try uploading the PDF later from the book detail page.');
        }
      }

      // Success - redirect to book detail page
      router.push(`/resources/books/${bookId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create book. Please try again.';
      setSubmitError(errorMessage);
      console.error('Submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkipPdf = () => {
    handleSubmit(false);
  };

  const handleSubmitWithPdf = () => {
    if (!pdfFile) {
      setPdfError('Please select a PDF file to upload');
      return;
    }
    handleSubmit(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add New Book</h1>
              <p className="text-sm text-gray-600 mt-1">
                Submit a book for theological evaluation
              </p>
            </div>
            <button
              onClick={() => router.push('/resources/books')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center gap-8">
            {/* Step 1 */}
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                  currentStep === 1
                    ? 'bg-blue-600 text-white'
                    : currentStep > 1
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {currentStep > 1 ? '✓' : '1'}
              </div>
              <span className={`text-sm font-medium ${currentStep === 1 ? 'text-gray-900' : 'text-gray-600'}`}>
                Lookup Method
              </span>
            </div>

            {/* Connector */}
            <div className={`w-16 h-1 ${currentStep > 1 ? 'bg-green-600' : 'bg-gray-200'}`} />

            {/* Step 2 */}
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                  currentStep === 2
                    ? 'bg-blue-600 text-white'
                    : currentStep > 2
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {currentStep > 2 ? '✓' : '2'}
              </div>
              <span className={`text-sm font-medium ${currentStep === 2 ? 'text-gray-900' : 'text-gray-600'}`}>
                Book Details
              </span>
            </div>

            {/* Connector */}
            <div className={`w-16 h-1 ${currentStep > 2 ? 'bg-green-600' : 'bg-gray-200'}`} />

            {/* Step 3 */}
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                  currentStep === 3
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                3
              </div>
              <span className={`text-sm font-medium ${currentStep === 3 ? 'text-gray-900' : 'text-gray-600'}`}>
                PDF Upload
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Step 1: Lookup Method */}
          {currentStep === 1 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Choose Lookup Method
              </h2>

              {/* Radio buttons */}
              <div className="space-y-4 mb-6">
                <label className="flex items-start gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="lookupMethod"
                    value="auto"
                    checked={lookupMethod === 'auto'}
                    onChange={(e) => setLookupMethod(e.target.value as LookupMethod)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">
                      ISBN/URL Lookup (Recommended)
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Automatically fetch book information from ISBN or online source
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="lookupMethod"
                    value="manual"
                    checked={lookupMethod === 'manual'}
                    onChange={(e) => setLookupMethod(e.target.value as LookupMethod)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">
                      Manual Entry
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Enter book information manually
                    </div>
                  </div>
                </label>
              </div>

              {/* ISBN/URL input (shown if auto lookup selected) */}
              {lookupMethod === 'auto' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ISBN or URL
                  </label>
                  <input
                    type="text"
                    value={lookupInput}
                    onChange={(e) => setLookupInput(e.target.value)}
                    placeholder="Enter ISBN (10 or 13 digits) or book URL"
                    className={`w-full px-4 py-2 border ${
                      lookupError ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {lookupError && (
                    <p className="mt-2 text-sm text-red-600">{lookupError}</p>
                  )}
                </div>
              )}

              {/* Continue button */}
              <div className="flex justify-end">
                <button
                  onClick={handleStep1Continue}
                  disabled={lookingUp}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {lookingUp ? 'Looking up...' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Book Metadata */}
          {currentStep === 2 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Book Details
              </h2>

              <div className="space-y-4 mb-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={metadata.title}
                    onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                    className={`w-full px-4 py-2 border ${
                      metadataErrors.title ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {metadataErrors.title && (
                    <p className="mt-1 text-sm text-red-600">{metadataErrors.title}</p>
                  )}
                </div>

                {/* Author */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Author <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={metadata.author}
                    onChange={(e) => setMetadata({ ...metadata, author: e.target.value })}
                    className={`w-full px-4 py-2 border ${
                      metadataErrors.author ? 'border-red-500' : 'border-gray-300'
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {metadataErrors.author && (
                    <p className="mt-1 text-sm text-red-600">{metadataErrors.author}</p>
                  )}
                </div>

                {/* Publisher */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Publisher
                  </label>
                  <input
                    type="text"
                    value={metadata.publisher}
                    onChange={(e) => setMetadata({ ...metadata, publisher: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Year */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Publication Year
                  </label>
                  <input
                    type="text"
                    value={metadata.year}
                    onChange={(e) => setMetadata({ ...metadata, year: e.target.value })}
                    placeholder="YYYY"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={metadata.description}
                    onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Cover Image URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cover Image URL
                  </label>
                  <input
                    type="url"
                    value={metadata.coverImageUrl}
                    onChange={(e) => setMetadata({ ...metadata, coverImageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between">
                <button
                  onClick={handleStep2Back}
                  className="px-6 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleStep2Continue}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: PDF Upload */}
          {currentStep === 3 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                PDF Upload (Optional)
              </h2>

              <p className="text-sm text-gray-600 mb-6">
                Upload a PDF copy of the book to enable in-app reading. This is optional.
              </p>

              {/* Drag & drop area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : pdfFile
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300'
                }`}
              >
                {pdfFile ? (
                  <div>
                    <div className="text-green-600 text-4xl mb-2">✓</div>
                    <p className="font-semibold text-gray-900 mb-1">{pdfFile.name}</p>
                    <p className="text-sm text-gray-600 mb-4">
                      {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    <button
                      onClick={() => setPdfFile(null)}
                      className="text-sm text-red-600 hover:text-red-800 underline"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="text-gray-400 text-4xl mb-2">📄</div>
                    <p className="text-gray-700 mb-2">
                      Drag and drop PDF here, or{' '}
                      <label className="text-blue-600 hover:text-blue-800 cursor-pointer underline">
                        browse
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect(file);
                          }}
                          className="hidden"
                        />
                      </label>
                    </p>
                    <p className="text-sm text-gray-500">
                      PDF files only, max 100MB
                    </p>
                  </div>
                )}
              </div>

              {pdfError && (
                <p className="mt-2 text-sm text-red-600">{pdfError}</p>
              )}

              {/* License type selection (shown if PDF uploaded) */}
              {pdfFile && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    License Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={licenseType}
                    onChange={(e) => setLicenseType(e.target.value as LicenseType)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="public_domain">Public Domain</option>
                    <option value="creative_commons">Creative Commons</option>
                    <option value="publisher_permission">Publisher Permission</option>
                    <option value="analysis_only">Analysis Only (Fair Use)</option>
                  </select>
                  <p className="mt-2 text-xs text-gray-500">
                    Select the appropriate license for this PDF. If unsure, choose "Analysis Only".
                  </p>
                </div>
              )}

              {/* Warnings */}
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-yellow-900 mb-2">
                  Important Copyright Information:
                </p>
                <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                  <li>Only upload PDFs you have legal rights to distribute</li>
                  <li>Uploaded PDFs must be complete (not partial or excerpts)</li>
                  <li>Copyright violations may result in account suspension</li>
                </ul>
              </div>

              {/* Submit error */}
              {submitError && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{submitError}</p>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex justify-between mt-6">
                <button
                  onClick={handleStep3Back}
                  disabled={submitting}
                  className="px-6 py-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={handleSkipPdf}
                    disabled={submitting}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'Skip PDF'}
                  </button>
                  {pdfFile && (
                    <button
                      onClick={handleSubmitWithPdf}
                      disabled={submitting}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Submitting...' : 'Submit with PDF'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserPermissions } from '../../../../hooks/useUserPermissions';
import { bookApi, CreateBookData } from '../../../../lib/api';
import clsx from 'clsx';

type WizardStep = 'metadata' | 'pdf';

// Constants
const MAX_FILE_SIZE_MB = 100;
const MAX_TITLE_LENGTH = 255;
const MAX_AUTHOR_LENGTH = 255;
const MAX_PUBLISHER_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 2000;
const MIN_PUBLICATION_YEAR = 1000;

// Utility function for URL validation
const isUrl = (str: string): boolean => {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

export default function AddNewBookPage() {
  const router = useRouter();
  const permissions = useUserPermissions();
  const [step, setStep] = useState<WizardStep>('metadata');
  const [bookData, setBookData] = useState<CreateBookData>({});
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfLicenseType, setPdfLicenseType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionsChecked, setPermissionsChecked] = useState(false);

  // Check permissions and redirect if needed
  useEffect(() => {
    const timer = setTimeout(() => {
      setPermissionsChecked(true);
      if (!permissions.canAddBooks) {
        router.push('/resources/books');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [permissions.canAddBooks, router]);

  // Show loading state while checking permissions
  if (!permissionsChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-600">Loading...</div>
      </div>
    );
  }

  const handleMetadataBack = () => {
    router.push('/resources/books');
  };

  const handleMetadataContinue = () => {
    // Validate required fields
    if (!bookData.title?.trim()) {
      setError('Title is required.');
      return;
    }
    if (!bookData.author?.trim()) {
      setError('Author is required.');
      return;
    }
    // Validate cover image URL if provided
    if (bookData.coverImageUrl && !isUrl(bookData.coverImageUrl)) {
      setError('Please enter a valid URL for the cover image.');
      return;
    }
    setError(null);
    setStep('pdf');
  };

  const handlePdfBack = () => {
    setStep('metadata');
  };

  const handleSkipPdf = async () => {
    await handleSubmit(false);
  };

  const handleSubmit = async (includePdf: boolean) => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Create book
      const createResponse = await bookApi.create(bookData);

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        setError(errorData.message || 'Failed to create book.');
        setLoading(false);
        return;
      }

      const createdBook = await createResponse.json();

      // Step 2: Upload PDF if provided
      if (includePdf && pdfFile) {
        if (!pdfLicenseType) {
          setError('Please select a license type for the PDF.');
          setLoading(false);
          return;
        }

        const uploadResponse = await bookApi.uploadPdf(createdBook.id, pdfFile, pdfLicenseType);

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          setError(`Book created, but PDF upload failed: ${errorData.message}`);
          setLoading(false);
          return;
        }
      }

      // Success!
      alert('Book submitted for evaluation! You\'ll receive an email when the theological analysis is complete (typically 2-5 minutes).');
      router.push(`/resources/books/${createdBook.id}`);
    } catch (err) {
      console.error('Error submitting book:', err);
      setError('Failed to submit book. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`File must be under ${MAX_FILE_SIZE_MB}MB.`);
        return;
      }
      if (file.type !== 'application/pdf') {
        setError('Please upload a valid PDF file.');
        return;
      }
      setPdfFile(file);
      setError(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push('/resources/books')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-2"
              >
                ← Back to Browse Books
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Add New Book</h1>
            </div>
            {/* Progress Indicator */}
            <div className="flex items-center gap-2">
              <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium', step === 'metadata' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600')}>1</div>
              <div className="w-8 h-0.5 bg-gray-300"></div>
              <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium', step === 'pdf' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600')}>2</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {error && (
            <div id="error-message" className="mb-6 bg-red-50 border border-red-200 rounded-md p-4" role="alert">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Step 1: Metadata */}
          {step === 'metadata' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Book Information</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="book-title" className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="book-title"
                    type="text"
                    value={bookData.title || ''}
                    onChange={(e) => setBookData({ ...bookData, title: e.target.value })}
                    maxLength={MAX_TITLE_LENGTH}
                    required
                    aria-describedby={error && !bookData.title?.trim() ? 'error-message' : undefined}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="book-author" className="block text-sm font-medium text-gray-700 mb-1">
                    Author <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="book-author"
                    type="text"
                    value={bookData.author || ''}
                    onChange={(e) => setBookData({ ...bookData, author: e.target.value })}
                    maxLength={MAX_AUTHOR_LENGTH}
                    required
                    aria-describedby={error && !bookData.author?.trim() ? 'error-message' : undefined}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="book-isbn" className="block text-sm font-medium text-gray-700 mb-1">
                    ISBN (optional - for automatic lookup)
                  </label>
                  <input
                    id="book-isbn"
                    type="text"
                    value={bookData.isbn || ''}
                    onChange={(e) => setBookData({ ...bookData, isbn: e.target.value })}
                    placeholder="e.g., 9781451673333"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">If provided, we'll try to auto-fill book details</p>
                </div>

                <div>
                  <label htmlFor="book-purchase-url" className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase URL (optional)
                  </label>
                  <input
                    id="book-purchase-url"
                    type="url"
                    value={bookData.purchaseUrl || ''}
                    onChange={(e) => setBookData({ ...bookData, purchaseUrl: e.target.value })}
                    placeholder="e.g., https://www.christianbook.com/..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Link where the book can be purchased (e.g., ChristianBook.com)</p>
                </div>

                <div>
                  <label htmlFor="book-publisher" className="block text-sm font-medium text-gray-700 mb-1">Publisher (optional)</label>
                  <input
                    id="book-publisher"
                    type="text"
                    value={bookData.publisher || ''}
                    onChange={(e) => setBookData({ ...bookData, publisher: e.target.value })}
                    maxLength={MAX_PUBLISHER_LENGTH}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="book-year" className="block text-sm font-medium text-gray-700 mb-1">Year (optional)</label>
                  <input
                    id="book-year"
                    type="number"
                    value={bookData.publicationYear || ''}
                    onChange={(e) => setBookData({ ...bookData, publicationYear: parseInt(e.target.value) })}
                    min={MIN_PUBLICATION_YEAR}
                    max={new Date().getFullYear()}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="book-description" className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                  <textarea
                    id="book-description"
                    value={bookData.description || ''}
                    onChange={(e) => setBookData({ ...bookData, description: e.target.value })}
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="book-cover-url" className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL (optional)</label>
                  <input
                    id="book-cover-url"
                    type="url"
                    value={bookData.coverImageUrl || ''}
                    onChange={(e) => setBookData({ ...bookData, coverImageUrl: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleMetadataBack}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleMetadataContinue}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Continue to PDF Upload →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: PDF Upload */}
          {step === 'pdf' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">PDF Upload (Optional but Recommended)</h2>
              <p className="text-gray-600 mb-6">Uploading a PDF enables deeper theological analysis.</p>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfFileChange}
                  className="hidden"
                  id="pdf-upload"
                />
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  <div className="text-gray-600 mb-2">
                    {pdfFile ? (
                      <span className="font-medium text-green-600">✓ {pdfFile.name}</span>
                    ) : (
                      <>
                        <span className="text-blue-600 font-medium">Click to browse</span> or drag and drop PDF here
                      </>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">Max size: {MAX_FILE_SIZE_MB}MB</div>
                </label>
              </div>

              {pdfFile && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={pdfLicenseType}
                    onChange={(e) => setPdfLicenseType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Please Select</option>
                    <option value="PUBLIC_DOMAIN">Public Domain</option>
                    <option value="CREATIVE_COMMONS">Creative Commons</option>
                    <option value="PUBLISHER_PERMISSION">Publisher Permission</option>
                    <option value="ANALYSIS_ONLY">Analysis Only (not shareable)</option>
                  </select>

                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md p-2">
                      ⚠️ Ensure you have rights to share this PDF.
                    </p>
                    <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md p-2">
                      ⚠️ PDF must be the complete book (not excerpts).
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handlePdfBack}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSkipPdf}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Skip PDF
                </button>
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={loading || (pdfFile !== null && !pdfLicenseType)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit Book →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

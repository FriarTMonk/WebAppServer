import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-9xl font-extrabold text-teal-600">404</h1>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Page not found
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <Link
            href="/"
            className="block w-full px-4 py-3 text-white bg-teal-600 hover:bg-teal-700 rounded-lg font-medium transition-colors"
          >
            Go back home
          </Link>

          <Link
            href="/support/tickets"
            className="block w-full px-4 py-3 text-teal-600 bg-white border border-teal-600 hover:bg-teal-50 rounded-lg font-medium transition-colors"
          >
            Contact support
          </Link>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>If you believe this is an error, please contact our support team.</p>
        </div>
      </div>
    </div>
  );
}

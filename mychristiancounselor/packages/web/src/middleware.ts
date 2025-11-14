import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // For admin routes, let the API handle authentication
  // Middleware can't access localStorage where tokens are stored
  // The admin pages will handle 401/403 responses and redirect to login
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};

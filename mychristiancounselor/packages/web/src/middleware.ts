import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Redirect non-www to www domain
  const host = request.headers.get('host');
  if (host === 'mychristiancounselor.online') {
    const url = request.nextUrl.clone();
    url.host = 'www.mychristiancounselor.online';
    return NextResponse.redirect(url, 301);
  }

  // For admin routes, let the API handle authentication
  // Middleware can't access localStorage where tokens are stored
  // The admin pages will handle 401/403 responses and redirect to login
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

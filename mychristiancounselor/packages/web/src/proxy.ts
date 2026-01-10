import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Redirect non-www to www domain
  const host = request.headers.get('host');
  if (host === 'mychristiancounselor.online') {
    // Construct redirect URL without internal port
    const protocol = request.nextUrl.protocol;
    const pathname = request.nextUrl.pathname;
    const search = request.nextUrl.search;
    const redirectUrl = `${protocol}//www.mychristiancounselor.online${pathname}${search}`;
    return NextResponse.redirect(redirectUrl, 301);
  }

  // For all routes, let the API handle authentication
  // The admin pages will handle 401/403 responses and redirect to login
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

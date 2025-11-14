import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if route is admin route
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Check for access token
    const accessToken = request.cookies.get('accessToken')?.value;

    if (!accessToken) {
      // Redirect to login if no token
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // TODO: Validate platform admin permission
    // For now, just check for valid token
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};

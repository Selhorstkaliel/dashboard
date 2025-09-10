import { NextRequest, NextResponse } from 'next/server';

const BASE_API_URL = process.env.BASE_API_URL || 'http://localhost:3001/api';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, static files, and public paths
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/login' ||
    pathname === '/' ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check if user is authenticated
  try {
    const response = await fetch(`${BASE_API_URL}/auth/me`, {
      headers: {
        Cookie: request.headers.get('cookie') || '',
      },
    });

    if (!response.ok) {
      // User is not authenticated, redirect to login
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  } catch (error) {
    // Error checking authentication, redirect to login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|$).*)'],
};
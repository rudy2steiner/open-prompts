import createMiddleware from 'next-intl/middleware';
import {pathnames, locales, localePrefix} from './config';
import { NextResponse, type NextRequest } from 'next/server';

const localeMiddleware = createMiddleware({
  defaultLocale: 'en',
  locales,
  pathnames,
  localePrefix,
  localeDetection: true,
});

export default function middleware(request: NextRequest) {
  const api = /^\/(?:en\/|zh\/|ja\/|ko\/|fr\/|de\/|es\/|pt\/)?api(?:\/|$)/.test(request.nextUrl.pathname);
  if (api && process.env.DB_MIGRATION_MODE === 'read-only') {
    return NextResponse.json({ error: 'Database migration in progress. Please retry shortly.' }, {
      status: 503, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' },
    });
  }
  if (request.nextUrl.pathname.startsWith('/api/')) return NextResponse.next();
  return localeMiddleware(request);
}

export const config = {
  matcher: [
    '/api/:path*',
    // Enable a redirect to a matching locale at the root
    '/',

    // Set a cookie to remember the previous locale for
    // all requests that have a locale prefix
    '/(en|zh|ja|ko|fr|de|es|pt)/:path*',

    // Enable redirects that add missing locales
    // (e.g. `/pathnames` -> `/en/pathnames`)
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
};

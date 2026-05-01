import { NextRequest, NextResponse } from 'next/server';
import { defaultLocale, locales, type Locale } from './i18n/config';

export function middleware(request: NextRequest) {
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;

  // If no valid locale cookie, set the default
  if (!cookieLocale || !locales.includes(cookieLocale as Locale)) {
    const response = NextResponse.next();
    response.cookies.set('NEXT_LOCALE', defaultLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Run on all pages except static assets and API routes
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};

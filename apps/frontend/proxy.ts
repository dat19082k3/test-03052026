import { NextRequest, NextResponse } from 'next/server';
import { defaultLocale, locales, type Locale } from './i18n/config';

export function proxy(request: NextRequest) {
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;

  const isValid = locales.includes(cookieLocale as Locale);

  const response = NextResponse.next();

  if (!isValid) {
    response.cookies.set('NEXT_LOCALE', defaultLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }

  return response;
}

export const config = {
  // Run on all pages except static assets and API routes
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};

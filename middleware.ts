import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
});

export const config = {
  // Match all pathnames except for
  // - /api routes
  // - /_next (Next.js internals)
  // - /_vercel (Vercel internals)
  // - /static (inside /public)
  // - all root files inside /public (e.g. /favicon.ico)
  matcher: ['/((?!api|_next|_vercel|static|.*\\..*).*)']
};
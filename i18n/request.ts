import { getRequestConfig } from 'next-intl/server';
import { defaultLocale } from './config';

export default getRequestConfig(async ({ locale }) => {
  // Use the provided locale or fall back to default
  const resolvedLocale = locale || defaultLocale;
  
  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default
  };
});
export type Locale = 'fr' | 'en';

export const defaultLocale: Locale = 'fr';
export const locales: Locale[] = ['fr', 'en'];

export const localePrefix = 'always'; // or 'as-needed' or 'never'
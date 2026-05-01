export const locales = ['vi', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'vi';

export const localeLabels: Record<Locale, string> = {
  vi: 'VI',
  en: 'EN',
};
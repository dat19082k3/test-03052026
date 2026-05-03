import { vi, enUS } from 'date-fns/locale';
export const locales = ['vi', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'vi';

export const localeLabels: Record<Locale, string> = {
  vi: 'VI',
  en: 'EN',
};

export const dateFnsLocales = {
  vi: vi,
  en: enUS,
};

export function getDateFnsLocale(locale: string) {
  return dateFnsLocales[locale as Locale] || vi;
}

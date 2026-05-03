'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { locales, localeLabels, type Locale } from '@/i18n/config';

export function LocaleSwitcher() {
  const currentLocale = useLocale() as Locale;
  const router = useRouter();

  function handleLocaleChange(locale: string) {
    if (locale === currentLocale) return;
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    router.refresh();
  }

  return (
    <Select value={currentLocale} onValueChange={handleLocaleChange}>
      <SelectTrigger className="h-9 w-auto min-w-[70px] border-none shadow-none focus:ring-0 text-sm font-medium pr-2">
        <SelectValue/>
      </SelectTrigger>
      <SelectContent align="end">
        {locales.map((locale) => (
          <SelectItem key={locale} value={locale}>
            {localeLabels[locale]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

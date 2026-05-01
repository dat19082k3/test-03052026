import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, locales, type Locale } from './config';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;

  const locale: Locale =
    cookieLocale && locales.includes(cookieLocale as Locale)
      ? (cookieLocale as Locale)
      : defaultLocale;

  const [common, validation, errors] = await Promise.all([
    import(`./${locale}/common.json`),
    import(`./${locale}/validation.json`),
    import(`./${locale}/errors.json`),
  ]);

  return {
    locale,
    messages: {
      common: common.default,
      validation: validation.default,
      errors: errors.default,
    },
  };
});

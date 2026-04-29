import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  const locale = 'vi';

  const [common, validation, errors] = await Promise.all([
    import(`../messages/${locale}/common.json`),
    import(`../messages/${locale}/validation.json`),
    import(`../messages/${locale}/errors.json`),
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

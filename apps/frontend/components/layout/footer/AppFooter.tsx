'use client';

import { useTranslations } from 'next-intl';

export function AppFooter() {
  const currentYear = new Date().getFullYear();
  const t = useTranslations('common.layout');
  const brand = t('brand');

  return (
    <footer className="border-t bg-background px-6 py-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
        <p>
          {t('footerCopyright', { year: currentYear, brand })}
        </p>
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-foreground transition-colors">{t('footerSupport')}</a>
          <a href="#" className="hover:text-foreground transition-colors">{t('footerDocs')}</a>
          <a href="#" className="hover:text-foreground transition-colors">{t('footerTerms')}</a>
        </div>
      </div>
    </footer>
  );
}

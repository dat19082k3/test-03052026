'use client';

import { useTranslations } from 'next-intl';

export default function AdminDashboardPage() {
  const t = useTranslations('common.layout.dashboard');

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border bg-card p-6 shadow-sm min-h-[220px]">
        <h3 className="text-lg font-semibold mb-2">{t('overview')}</h3>
        <p className="text-sm text-muted-foreground">{t('overviewDesc')}</p>
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-sm min-h-[220px]">
        <h3 className="text-lg font-semibold mb-2">{t('recentVouchers')}</h3>
        <p className="text-sm text-muted-foreground">{t('recentVouchersDesc')}</p>
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-sm min-h-[280px]">
        <h3 className="text-lg font-semibold mb-2">{t('warehouseStats')}</h3>
        <p className="text-sm text-muted-foreground">{t('warehouseStatsDesc')}</p>
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-sm min-h-[280px]">
        <h3 className="text-lg font-semibold mb-2">{t('activity')}</h3>
        <p className="text-sm text-muted-foreground">{t('activityDesc')}</p>
      </div>
    </div>
  );
}

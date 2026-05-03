'use client';

import { useTranslations } from 'next-intl';

export default function WarehousesPage() {
  const t = useTranslations('common');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {t('layout.nav.warehouses')}
        </h1>
        <p className="text-muted-foreground">
          {t('layout.dashboard.warehouseStatsDesc')}
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm min-h-[400px] flex items-center justify-center text-muted-foreground">
        {t('status.noData')}
      </div>
    </div>
  );
}

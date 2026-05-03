'use client';

import { useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/api';
import { toast } from 'sonner';
import { errorCodeToTranslationKey } from '@/lib/api';
import { useInventoryExcelContext } from '../context/InventoryExcelContext';

async function pollImportJob(jobId: string) {
  const terminal = new Set(['completed', 'failed']);
  for (;;) {
    const res = await api.inventory.getExcelJob(jobId);
    if (!res.success) {
      throw new Error(res.error.code);
    }
    const job = res.data;
    if (terminal.has(job.state)) {
      return job;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}

export function useVoucherImport(onSuccess?: () => void) {
  const t = useTranslations('common');
  const inputRef = useRef<HTMLInputElement>(null);
  const { excelClientId, isExcelBusy, setExcelBusy } = useInventoryExcelContext();

  const openFilePicker = useCallback(() => {
    if (isExcelBusy) return;
    inputRef.current?.click();
  }, [isExcelBusy]);

  const onFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || isExcelBusy) return;

      const toastId = toast.loading(t('excel.importProgress'));

      setExcelBusy(true);
      try {
        const started = await api.inventory.importVouchers(file, excelClientId);
        if (!started.success) {
          const key = errorCodeToTranslationKey(started.error.code);
          toast.error(t.has(key) ? t(key) : started.error.code, { id: toastId });
          return;
        }

        const jobId = started.data.jobId;
        if (!jobId) {
          toast.error(t('excel.failed'), { id: toastId });
          return;
        }

        const job = await pollImportJob(String(jobId));

        if (job.state === 'failed') {
          toast.error(job.failedReason || t('excel.failed'), { id: toastId });
          return;
        }

        const imported = job.returnvalue?.imported ?? 0;
        toast.success(t('excel.importDone', { count: imported }), { id: toastId });
        onSuccess?.();
      } catch (err) {
        console.error('Import error', err);
        toast.error(t('excel.failed'), { id: toastId });
      } finally {
        setExcelBusy(false);
      }
    },
    [excelClientId, isExcelBusy, onSuccess, setExcelBusy, t],
  );

  return { inputRef, openFilePicker, onFileSelected, isImporting: isExcelBusy };
}

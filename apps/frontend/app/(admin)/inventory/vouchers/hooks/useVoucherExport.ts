'use client';

import { useTranslations } from 'next-intl';
import { api } from '@/api';
import { InventoryVoucherExportMode, ExportInventoryVouchersDto } from '@repo/types';
import { toast } from 'sonner';
import { triggerInventoryExcelDownload } from '@/lib/inventory-excel-download';
import { errorCodeToTranslationKey } from '@/lib/api';
import { useInventoryExcelContext } from '../context/InventoryExcelContext';

export interface UseVoucherExportParams {
  selectedIds?: string[];
}

async function pollExcelJob(jobId: string) {
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
    await new Promise((r) => setTimeout(r, 2000));
  }
}

export function useVoucherExport({ selectedIds = [] }: UseVoucherExportParams = {}) {
  const t = useTranslations('common');
  const { excelClientId, isExcelBusy, setExcelBusy } = useInventoryExcelContext();

  const exportVouchers = async (mode: InventoryVoucherExportMode) => {
    if (isExcelBusy) return;

    const dto: ExportInventoryVouchersDto = {
      mode,
      voucherIds: mode === 'list_selected' || mode === 'forms_selected' ? selectedIds : undefined,
    };

    setExcelBusy(true);
    const toastId = toast.loading(
      mode === 'list_all' || mode === 'list_selected'
        ? t('excel.exportListProgress')
        : t('excel.exportFormsProgress'),
    );
    try {
      const result = await api.inventory.exportVouchers(dto, excelClientId);

      if (!result.success) {
        const key = errorCodeToTranslationKey(result.error.code);
        toast.error(t.has(key) ? t(key) : result.error.code, { id: toastId });
        return;
      }

      const jobId = result.data.jobId;
      if (!jobId) {
        toast.error(t('excel.failed'), { id: toastId });
        return;
      }

      const job = await pollExcelJob(String(jobId));

      if (job.state === 'failed') {
        toast.error(job.failedReason || t('excel.failed'), { id: toastId });
        return;
      }

      const fileName = job.returnvalue?.fileName || `export-${jobId}.xlsx`;
      try {
        await triggerInventoryExcelDownload(String(jobId), fileName);
      } catch {
        toast.error(t('excel.downloadFailed'), { id: toastId });
        return;
      }

      toast.success(t('excel.exportDone'), { id: toastId });
    } catch (e) {
      console.error('Export error', e);
      toast.error(t('excel.failed'), { id: toastId });
    } finally {
      setExcelBusy(false);
    }
  };

  return {
    isExporting: isExcelBusy,
    exportVouchers,
  };
}

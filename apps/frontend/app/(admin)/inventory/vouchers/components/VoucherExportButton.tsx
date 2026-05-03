'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Download, ChevronDown, List, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { InventoryVoucherExportMode } from '@repo/types';
import { useVoucherExport } from '../hooks/useVoucherExport';
import { cn } from '@/lib/utils';

export interface VoucherExportButtonProps {
  selectedIds: string[];
  className?: string;
}

export function VoucherExportButton({ selectedIds, className }: VoucherExportButtonProps) {
  const t = useTranslations('common');
  const { isExporting, exportVouchers } = useVoucherExport({ selectedIds });
  const selectedCount = selectedIds.length;

  const handleExport = (mode: InventoryVoucherExportMode) => {
    void exportVouchers(mode);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn("h-9 gap-2", className)}
          disabled={isExporting}
        >
          <Download className={cn("h-4 w-4 text-muted-foreground", isExporting && "animate-pulse")} />
          <span className="hidden lg:inline">
            {t('actions.export', { fallback: 'Export' })}
            {selectedCount > 0 && ` (${selectedCount})`}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-full">
        <DropdownMenuLabel>{t('actions.exportOptions', { fallback: 'Export Options' })}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => handleExport('list_all')} className="gap-2">
          <List className="h-4 w-4 text-muted-foreground" />
          <span>{t('actions.exportAll', { fallback: 'Export all (Excel)' })}</span>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => handleExport('list_selected')} 
          disabled={selectedCount === 0}
          className="gap-2"
        >
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          <span>{t('actions.exportSelectedList', { fallback: 'Export selected list' })}</span>
          {selectedCount > 0 && (
            <span className="ml-auto text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {selectedCount}
            </span>
          )}
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => handleExport('forms_selected')} 
          disabled={selectedCount === 0}
          className="gap-2"
        >
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span>{t('actions.exportSelectedForms', { fallback: 'Export selected forms' })}</span>
          {selectedCount > 0 && (
            <span className="ml-auto text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {selectedCount}
            </span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

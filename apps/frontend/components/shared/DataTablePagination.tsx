import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface DataTablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  className?: string;
}

export function DataTablePagination({
  currentPage,
  totalPages,
  onPageChange,
  onItemsPerPageChange,
  totalItems,
  itemsPerPage,
  className,
}: DataTablePaginationProps) {
  const t = useTranslations('common');

  return (
    <div className={cn('flex items-center justify-between px-2', className)}>
      <div className="flex-1 text-sm text-muted-foreground">
        {totalItems !== undefined && itemsPerPage !== undefined && (
          <span>
            {t('pagination.showing', {
              from: Math.min((currentPage - 1) * itemsPerPage + 1, totalItems),
              to: Math.min(currentPage * itemsPerPage, totalItems),
              total: totalItems,
            })}
          </span>
        )}
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium whitespace-nowrap">{t('pagination.rows')}</p>
          <Select
            value={itemsPerPage?.toString() || '10'}
            onValueChange={(value) => {
              onItemsPerPageChange?.(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={itemsPerPage?.toString()} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 50, 100, 200, 500].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">
            {t('pagination.pageOf', {
              current: currentPage,
              total: totalPages,
            })}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1 || totalPages === 0}
          >
            <span className="sr-only">{t('pagination.firstPage', { fallback: 'First' })}</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || totalPages === 0}
          >
            <span className="sr-only">{t('pagination.prevPage', { fallback: 'Previous' })}</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || totalPages === 0}
          >
            <span className="sr-only">{t('pagination.nextPage', { fallback: 'Next' })}</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages || totalPages === 0}
          >
            <span className="sr-only">{t('pagination.lastPage', { fallback: 'Last' })}</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

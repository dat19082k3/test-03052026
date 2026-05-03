'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  FilterX, 
  Upload, 
  Plus, 
  ChevronDown, 
  Calendar as CalendarIcon,
  RefreshCw
} from 'lucide-react';
import { DataTableFilterBar } from '@/components/shared/DataTableFilterBar';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { getDateFnsLocale } from '@/i18n/config';
import { VoucherExportButton } from './VoucherExportButton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useVoucherImport } from '../hooks/useVoucherImport';
import { useInventoryExcelContext } from '../context/InventoryExcelContext';

export interface VoucherFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedStatuses: string[];
  onStatusesChange: (statuses: string[]) => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  locale: string;
  onRefresh: () => void;
  isRefreshing?: boolean;
  selectedIds: string[];
  showOnlySelected: boolean;
  onShowOnlySelectedChange: (value: boolean) => void;
  onImportSuccess?: () => void;
}

export function VoucherFilters({
  searchTerm,
  onSearchChange,
  selectedStatuses,
  onStatusesChange,
  dateRange,
  onDateRangeChange,
  locale,
  onRefresh,
  isRefreshing,
  selectedIds,
  showOnlySelected,
  onShowOnlySelectedChange,
  onImportSuccess,
}: VoucherFiltersProps) {
  const t = useTranslations('common');
  const [isMounted, setIsMounted] = React.useState(false);
  
  React.useEffect(() => {
    setIsMounted(true);
  }, []);
  const { isExcelBusy } = useInventoryExcelContext();
  const { inputRef, openFilePicker, onFileSelected, isImporting } = useVoucherImport(onImportSuccess);

  const handleDateSelect = (range: DateRange | undefined) => {
    if (range?.from && !range.to) {
      // Default to 24h later
      const newTo = new Date(range.from.getTime() + 24 * 60 * 60 * 1000);
      onDateRangeChange({ from: range.from, to: newTo });
    } else {
      onDateRangeChange(range);
    }
  };

  const handleTimeChange = (type: 'from' | 'to', value: string) => {
    if (!dateRange || !dateRange.from) return;
    
    const [hours, minutes] = value.split(':').map(Number);
    const newRange = { ...dateRange };
    
    if (type === 'from' && newRange.from) {
      const d = new Date(newRange.from);
      d.setHours(hours || 0, minutes || 0, 0, 0);
      newRange.from = d;
      
      // If we only have 'from', or if we want to maintain the 24h gap 
      if (!newRange.to) {
        newRange.to = new Date(d.getTime() + 24 * 60 * 60 * 1000);
      }
    } else if (type === 'to' && newRange.to) {
      const d = new Date(newRange.to);
      d.setHours(hours || 0, minutes || 0, 0, 0);
      newRange.to = d;
    }
    
    onDateRangeChange(newRange);
  };

  const statusOptions = [
    { value: 'draft', label: t('status.draft', { fallback: 'Draft' }) },
    { value: 'posted', label: t('status.posted', { fallback: 'Posted' }) },
    { value: 'cancelled', label: t('status.cancelled', { fallback: 'Cancelled' }) },
  ];

  const handleStatusToggle = (value: string) => {
    let next: string[];
    const isSelected = selectedStatuses.includes(value);
    if (isSelected) {
      next = selectedStatuses.filter((s) => s !== value);
    } else {
      next = [...selectedStatuses, value];
    }
    
    if (next.length === statusOptions.length) {
      onStatusesChange([]);
    } else {
      onStatusesChange(next);
    }
  };

  const clearFilters = () => {
    onStatusesChange([]);
    onDateRangeChange(undefined);
    onSearchChange('');
  };

  const getStatusLabel = () => {
    if (selectedStatuses.length === 0 || selectedStatuses.length === statusOptions.length) {
      return t('status.all', { fallback: 'All Statuses' });
    }
    if (selectedStatuses.length === 1) {
      return statusOptions.find(o => o.value === selectedStatuses[0])?.label;
    }
    return `${selectedStatuses.length} ${t('status.status', { fallback: 'Statuses' })}`;
  };

  const hasActiveFilters = searchTerm.length > 0 || selectedStatuses.length > 0 || !!dateRange;

  return (
    <DataTableFilterBar className="justify-between gap-4">
      <div className="flex flex-1 items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('actions.search', { fallback: 'Search by Voucher No...' })} 
            className="pl-9 h-9 bg-background focus-visible:ring-1" 
          />
        </div>

        {/* Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 justify-start text-left font-normal gap-2 border-dashed bg-background min-w-[240px]",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "MMM dd, HH:mm", { locale: getDateFnsLocale(locale) })} -{" "}
                    {format(dateRange.to, "MMM dd, HH:mm", { locale: getDateFnsLocale(locale) })}
                  </>
                ) : (
                  format(dateRange.from, "MMM dd, HH:mm", { locale: getDateFnsLocale(locale) })
                )
              ) : (
                <span>{t('filters.dateRange', { fallback: 'Date Range' })}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex flex-col">
              <Calendar
                locale={getDateFnsLocale(locale)}
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={handleDateSelect}
                numberOfMonths={2}
              />
              <div className="flex items-center gap-4 p-4 border-t bg-muted/20">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs font-medium text-muted-foreground">{t('filters.fromTime', { fallback: 'From time' })}</label>
                  <Input 
                    type="time" 
                    className="h-8 text-sm"
                    value={dateRange?.from ? format(dateRange.from, 'HH:mm', { locale: getDateFnsLocale(locale) }) : '00:00'}
                    onChange={(e) => handleTimeChange('from', e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs font-medium text-muted-foreground">{t('filters.toTime', { fallback: 'To time' })}</label>
                  <Input 
                    type="time" 
                    className="h-8 text-sm"
                    value={dateRange?.to ? format(dateRange.to, 'HH:mm', { locale: getDateFnsLocale(locale) }) : '23:59'}
                    onChange={(e) => handleTimeChange('to', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Status Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2 border-dashed bg-background">
              <span className="text-muted-foreground font-normal">{t('status.status', { fallback: 'Status' })}:</span>
              <span className="font-medium">{getStatusLabel()}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[200px]">
            <DropdownMenuLabel>{t('status.status', { fallback: 'Select Status' })}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={selectedStatuses.length === 0}
              onCheckedChange={() => onStatusesChange([])}
            >
              {t('status.all', { fallback: 'All Statuses' })}
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            {statusOptions.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={selectedStatuses.includes(option.value)}
                onCheckedChange={() => handleStatusToggle(option.value)}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 text-muted-foreground hover:text-foreground"
          onClick={onRefresh}
          disabled={isRefreshing}
          title={t('actions.refresh', { fallback: 'Refresh' })}
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
        </Button>

        <Button 
          variant="ghost" 
          size="sm"
          disabled={!hasActiveFilters}
          className={cn(
            "h-9 px-3 transition-all duration-200 rounded-md",
            hasActiveFilters 
              ? "text-primary-600 hover:text-primary-700 hover:bg-orange-20 border border-primary-200/50 bg-primary-50/30" 
              : "text-muted-foreground opacity-40 grayscale"
          )} 
          onClick={clearFilters}
        >
          <FilterX className={cn("h-4 w-4 mr-2", hasActiveFilters && "stroke-[2.5px]")} />
          <span className="font-medium">{t('actions.clear', { fallback: 'Clear Filters' })}</span>
        </Button>

        <div className="flex items-center space-x-2 px-2 py-1 ml-1">
          <Checkbox 
            id="show-selected" 
            checked={showOnlySelected}
            onCheckedChange={(checked) => onShowOnlySelectedChange(!!checked)}
          />
          <Label 
            htmlFor="show-selected" 
            className="text-xs font-medium leading-none cursor-pointer select-none flex items-center gap-1.5"
          >
            {t('actions.showSelectedOnly', { fallback: 'Show selected' })}
            {isMounted && (selectedIds || []).length > 0 && (
              <span className="flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 shadow-sm">
                {(selectedIds || []).length}
              </span>
            )}
          </Label>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={onFileSelected}
        />
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2"
          disabled={isExcelBusy || isImporting}
          onClick={openFilePicker}
        >
          <Upload className={cn('h-4 w-4 text-muted-foreground', isImporting && 'animate-pulse')} />
          <span className="hidden lg:inline">{t('actions.import', { fallback: 'Import' })}</span>
        </Button>
        <VoucherExportButton selectedIds={selectedIds} />
        <Button size="sm" className="h-9 gap-2 shadow-sm bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t('actions.create', { fallback: 'New Voucher' })}</span>
        </Button>
      </div>
    </DataTableFilterBar>
  );
}

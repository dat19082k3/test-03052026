'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/shared/DataTable';
import { DataTablePagination } from '@/components/shared/DataTablePagination';
import { VoucherFilters } from './components/VoucherFilters';
import { getVoucherColumns, Voucher } from './components/VoucherColumns';
import { useVouchers } from './hooks/useVouchers';
import { cn } from '@/lib/utils';
import { InventoryExcelProvider } from './context/InventoryExcelContext';

function VouchersPageContent() {
  const t = useTranslations('common');
  
  const {
    data,
    isLoading,
    totalItems,
    totalPages,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    searchTerm,
    setSearchTerm,
    selectedStatuses,
    dateRange,
    sortConfig,
    handleFilter,
    handleDateRangeChange,
    handleSort,
    isFetching,
    isPlaceholderData,
    locale,
    timezone,
    refetch,
    selectedIds,
    handleIdsChange,
    showOnlySelected,
    handleShowOnlySelectedChange,
  } = useVouchers();
  
  const handleSelectionChange = (selectedKeys: string[]) => {
    handleIdsChange(selectedKeys);
  };

  const currentData: Voucher[] = data.map(v => ({
    id: v.id,
    voucherNo: v.voucher_number,
    date: v.voucher_date.toString(),
    supplier: v.deliverer_name || '',
    totalAmount: v.total_amount_numeric || 0,
    status: v.status as Voucher['status'],
    creator: v.created_by || '',
  }));

  const filteredData = currentData;

  const columns = getVoucherColumns(t, locale, timezone);

  return (
    <div className="flex flex-col h-[calc(100vh-11.5rem)] min-h-[500px] gap-4 w-full">
      <VoucherFilters 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedStatuses={selectedStatuses}
        onStatusesChange={handleFilter}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        locale={locale}
        onRefresh={refetch}
        isRefreshing={isFetching}
        selectedIds={selectedIds || []}
        showOnlySelected={showOnlySelected}
        onShowOnlySelectedChange={handleShowOnlySelectedChange}
        onImportSuccess={refetch}
      />
      
      <div className="flex-1 flex flex-col min-h-0 bg-background rounded-xl border shadow-sm">
        <DataTable
           columns={columns}
           data={filteredData}
           keyExtractor={(row) => row.id}
           selectable
           onSelectionChange={handleSelectionChange}
           selectedRowIds={selectedIds}
           emptyMessage={(isLoading || isFetching) ? t('status.loading', { fallback: 'Loading...' }) : t('status.noData', { fallback: 'No data found' })}
           className={cn("border-none rounded-none shadow-none flex-1", isFetching && "opacity-50 pointer-events-none transition-opacity")}
           manualSorting
           sortConfig={sortConfig}
           onSortChange={handleSort}
        />

        <div className="border-t p-3 bg-muted/20">
          <DataTablePagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
          />
        </div>
      </div>
    </div>
  );
}

export default function VouchersPage() {
  return (
    <InventoryExcelProvider>
      <VouchersPageContent />
    </InventoryExcelProvider>
  );
}

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTableProps } from './types';
import { useDataTable } from './useDataTable';

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  selectable,
  onSelectionChange,
  className,
  emptyMessage = 'No data available.',
  manualSorting,
  onSortChange,
  sortConfig: externalSortConfig,
  selectedRowIds,
}: DataTableProps<T>) {
  const {
    sortConfig,
    isAllSelected,
    sortedData,
    selectedKeys,
    handleSelectAll,
    handleSelectRow,
    handleSort,
  } = useDataTable({ 
    data, 
    keyExtractor, 
    onSelectionChange,
    manualSorting,
    onSortChange,
    sortConfig: externalSortConfig,
    selectedRowIds
  });

  return (
    <div className={cn('relative w-full flex-1 flex flex-col min-h-0', className)}>
      <Table 
        wrapperClassName="flex-1 flex flex-col min-h-0 w-full overflow-hidden" 
        className="flex flex-col w-full h-full"
      >
        <TableHeader className="flex-none w-full border-b bg-muted/20 z-10 relative">
          <TableRow className="flex w-full hover:bg-transparent border-b-0">
            {selectable && (
              <TableHead className="w-12 flex-none flex items-center justify-center px-0">
                <input
                  type="checkbox"
                  className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  checked={isAllSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </TableHead>
            )}
            {columns.map((col) => (
              <TableHead
                key={col.id}
                className={cn('flex-1 flex items-center px-4 py-3 font-semibold whitespace-nowrap', col.className)}
              >
                {col.sortable ? (
                  <button
                    className={cn(
                      "flex w-full items-center gap-1 hover:text-foreground transition-colors outline-none", 
                      col.className?.includes('justify-end') ? 'justify-end' : ''
                    )}
                    onClick={() => handleSort(col.id)}
                  >
                    {col.header}
                    {sortConfig?.key === col.id ? (
                      sortConfig.direction === 'asc' ? (
                        <ChevronUp className="h-4 w-4 shrink-0 transition-transform" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform" />
                      )
                    ) : (
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-40 hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                ) : (
                  <span className={cn("flex w-full", col.className?.includes('justify-end') ? 'justify-end' : '')}>
                    {col.header}
                  </span>
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        
        <TableBody className="flex-1 w-full flex flex-col overflow-y-auto">
          {sortedData.length === 0 ? (
            <TableRow className="flex w-full flex-1">
              <TableCell
                className="flex-1 flex items-center justify-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            sortedData.map((row) => {
              const key = keyExtractor(row);
              const isSelected = selectedKeys.has(key);
              return (
                <TableRow
                  key={key}
                  data-state={isSelected ? 'selected' : undefined}
                  className="flex w-full border-b transition-colors hover:bg-muted/30"
                >
                  {selectable && (
                    <TableCell className="w-12 flex-none flex items-center justify-center px-0">
                      <input
                        type="checkbox"
                        className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        checked={isSelected}
                        onChange={(e) => handleSelectRow(key, e.target.checked)}
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell 
                      key={`${col.id}-${key}`} 
                      className={cn('flex-1 inline-flex items-center px-4 py-2.5 min-w-0', col.className)}
                    >
                      <div className="w-full truncate">{col.cell(row)}</div>
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

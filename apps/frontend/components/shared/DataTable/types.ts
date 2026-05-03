import React from 'react';

export interface ColumnDef<T> {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string; // e.g. for text alignment or width constraints
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  selectable?: boolean;
  onSelectionChange?: (selectedKeys: string[]) => void;
  selectedRowIds?: string[];
  className?: string;
  emptyMessage?: React.ReactNode;
  manualSorting?: boolean;
  onSortChange?: (sortConfig: SortConfig) => void;
  sortConfig?: SortConfig;
}

export type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
} | null;

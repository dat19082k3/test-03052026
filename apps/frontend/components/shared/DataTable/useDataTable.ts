import { useState, useMemo } from 'react';
import { SortConfig } from './types';

interface UseDataTableProps<T> {
  data: T[];
  keyExtractor: (row: T) => string;
  onSelectionChange?: (selectedKeys: string[]) => void;
  manualSorting?: boolean;
  onSortChange?: (sortConfig: SortConfig) => void;
  sortConfig?: SortConfig;
}

export function useDataTable<T>({
  data,
  keyExtractor,
  onSelectionChange,
  manualSorting,
  onSortChange,
  sortConfig: externalSortConfig,
}: UseDataTableProps<T>) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [internalSortConfig, setInternalSortConfig] = useState<SortConfig>(null);

  const sortConfig = externalSortConfig !== undefined ? externalSortConfig : internalSortConfig;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allKeys = new Set(data.map(keyExtractor));
      setSelectedKeys(allKeys);
      onSelectionChange?.(Array.from(allKeys));
    } else {
      setSelectedKeys(new Set());
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (key: string, checked: boolean) => {
    const newSelected = new Set(selectedKeys);
    if (checked) {
      newSelected.add(key);
    } else {
      newSelected.delete(key);
    }
    setSelectedKeys(newSelected);
    onSelectionChange?.(Array.from(newSelected));
  };

  const handleSort = (colId: string) => {
    let nextSort: SortConfig = null;
    if (sortConfig?.key === colId) {
      if (sortConfig.direction === 'asc') nextSort = { key: colId, direction: 'desc' };
    } else {
      nextSort = { key: colId, direction: 'asc' };
    }

    if (externalSortConfig === undefined) {
      setInternalSortConfig(nextSort);
    }
    onSortChange?.(nextSort);
  };

  const isAllSelected = data.length > 0 && selectedKeys.size === data.length;

  const sortedData = useMemo(() => {
    if (!sortConfig || manualSorting) return data;
    
    return [...data].sort((a, b) => {
      const colId = sortConfig.key;
      const valA = (a as any)[colId];
      const valB = (b as any)[colId];

      if (valA === valB) return 0;
      
      const comparison = valA < valB ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  return {
    selectedKeys,
    sortConfig,
    isAllSelected,
    sortedData,
    handleSelectAll,
    handleSelectRow,
    handleSort,
  };
}

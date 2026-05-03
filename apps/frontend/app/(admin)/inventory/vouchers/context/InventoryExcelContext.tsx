'use client';

import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

export interface InventoryExcelContextValue {
  excelClientId: string;
  isExcelBusy: boolean;
  setExcelBusy: (busy: boolean) => void;
}

const InventoryExcelContext = createContext<InventoryExcelContextValue | null>(null);

export function InventoryExcelProvider({ children }: { children: React.ReactNode }) {
  const [excelClientId] = useState(() => {
    if (typeof window === 'undefined') return '';
    let id = localStorage.getItem('inventory-excel-client-id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('inventory-excel-client-id', id);
    }
    return id;
  });

  const [isExcelBusy, setExcelBusy] = useState(false);

  const value = useMemo(
    () => ({
      excelClientId,
      isExcelBusy,
      setExcelBusy,
    }),
    [excelClientId, isExcelBusy],
  );

  return <InventoryExcelContext.Provider value={value}>{children}</InventoryExcelContext.Provider>;
}

export function useInventoryExcelContext() {
  const ctx = useContext(InventoryExcelContext);
  if (!ctx) {
    throw new Error('useInventoryExcelContext must be used within InventoryExcelProvider');
  }
  return ctx;
}

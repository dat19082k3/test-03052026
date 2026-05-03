import { useMemo, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { format, parse, isValid } from 'date-fns';
import { api } from '@/api';
import { SortConfig } from '@/components/shared/DataTable/types';
import { DateRange } from 'react-day-picker';
import { useDebounce } from '@/hooks/use-debounce';
import { useLocale } from 'next-intl';

export type TableState = {
  page: number;
  pageSize: number;
  search: string;
  status: string[];
  dateRange: DateRange | undefined;
  sort: SortConfig;
};

const PERSIST_KEY = 'vouchers_table_state';

const defaultState: TableState = {
  page: 1,
  pageSize: 10,
  search: '',
  status: [],
  dateRange: undefined,
  sort: null,
};

function parseUrlState(searchParams: URLSearchParams): TableState {
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('limit') || '10', 10);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status')?.split(',').filter(Boolean) || [];
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const sortField = searchParams.get('sortBy');
  const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc';

  return {
    page,
    pageSize,
    search,
    status,
    dateRange: from ? { 
      from: from.includes('T') ? new Date(from) : parse(from, 'yyyy-MM-dd', new Date()), 
      to: to ? (to.includes('T') ? new Date(to) : parse(to, 'yyyy-MM-dd', new Date())) : undefined 
    } : undefined,
    sort: sortField ? { key: sortField, direction: sortOrder } : null,
  };
}

export function useVouchers() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const locale = useLocale();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // 1. Initial state (Synchronous to avoid race conditions)
  const [tableState, setTableState] = useState<TableState>(() => {
    const hasParams = searchParams.has('page') || 
                      searchParams.has('limit') || 
                      searchParams.has('search') || 
                      searchParams.has('status') || 
                      searchParams.has('from');

    if (hasParams) {
      // Create a plain URLSearchParams from ReadonlyURLSearchParams
      const params = new URLSearchParams(searchParams.toString());
      return parseUrlState(params);
    }

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(PERSIST_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Hydrate dates
          if (parsed.dateRange) {
            if (parsed.dateRange.from) parsed.dateRange.from = new Date(parsed.dateRange.from);
            if (parsed.dateRange.to) parsed.dateRange.to = new Date(parsed.dateRange.to);
          }
          return parsed;
        }
      } catch (e) {
        console.error('Failed to restore voucher state', e);
      }
    }

    return defaultState;
  });

  // 2. Persistent save to localStorage
  useEffect(() => {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(tableState));
  }, [tableState]);

  // 3. Sync State to URL
  const syncToUrl = useCallback((state: TableState) => {
    const params = new URLSearchParams();
    if (state.page > 1) params.set('page', state.page.toString());
    if (state.pageSize !== 10) params.set('limit', state.pageSize.toString());
    if (state.search) params.set('search', state.search);
    if (state.status.length > 0) params.set('status', state.status.join(','));
    if (state.dateRange?.from && isValid(state.dateRange.from)) params.set('from', format(state.dateRange.from, "yyyy-MM-dd'T'HH:mm:ss"));
    if (state.dateRange?.to && isValid(state.dateRange.to)) params.set('to', format(state.dateRange.to, "yyyy-MM-dd'T'HH:mm:ss"));
    if (state.sort) {
      params.set('sortBy', state.sort.key);
      params.set('sortOrder', state.sort.direction);
    }
    
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
  }, [pathname, router]);

  // Update URL whenever tableState changes
  useEffect(() => {
    syncToUrl(tableState);
  }, [tableState, syncToUrl]);

  // 4. Debounce entire state for API calls
  const debouncedState = useDebounce(tableState, 400);

  // 5. Build Query Params
  const queryParams = useMemo(() => ({
    page: debouncedState.page,
    limit: debouncedState.pageSize,
    search: debouncedState.search || undefined,
    status: debouncedState.status.length > 0 ? debouncedState.status.join(',') : undefined,
    from: debouncedState.dateRange?.from && isValid(debouncedState.dateRange.from) ? format(debouncedState.dateRange.from, "yyyy-MM-dd'T'HH:mm:ss") : undefined,
    to: debouncedState.dateRange?.to && isValid(debouncedState.dateRange.to) ? format(debouncedState.dateRange.to, "yyyy-MM-dd'T'HH:mm:ss") : undefined,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    sortBy: debouncedState.sort?.key,
    sortOrder: debouncedState.sort?.direction,
  }), [debouncedState]);

  // 6. Data Fetching via TanStack Query
  const { data: queryResult, isLoading, isPlaceholderData, refetch, isFetching } = useQuery({
    queryKey: ['vouchers', queryParams],
    queryFn: () => api.inventory.getVouchers(queryParams),
    placeholderData: keepPreviousData,
  });

  const vouchers = queryResult?.success ? queryResult.data : [];
  const meta = (queryResult?.success ? queryResult.meta : null) || { total: 0, totalPages: 0 };

  // 7. Prefetch Next Page
  useEffect(() => {
    if (!isPlaceholderData && tableState.page < meta.totalPages) {
      const nextPageParams = { ...queryParams, page: tableState.page + 1 };
      queryClient.prefetchQuery({
        queryKey: ['vouchers', nextPageParams],
        queryFn: () => api.inventory.getVouchers(nextPageParams),
      });
    }
  }, [tableState.page, meta.totalPages, isPlaceholderData, queryClient, queryParams]);

  // 8. Intent-based Actions
  const handlePageChange = (page: number) => {
    setTableState(prev => ({ ...prev, page }));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setTableState(prev => ({ ...prev, pageSize, page: 1 }));
  };

  const handleSearchAction = (search: string) => {
    setTableState(prev => ({ ...prev, search, page: 1 }));
  };

  const handleFilterAction = (status: string[]) => {
    setTableState(prev => ({ ...prev, status, page: 1 }));
  };

  const handleDateRangeAction = (dateRange: DateRange | undefined) => {
    setTableState(prev => ({ ...prev, dateRange, page: 1 }));
  };

  const handleSort = (value: SortConfig | ((prev: SortConfig) => SortConfig)) => {
    setTableState(prev => {
        let nextSort: SortConfig;
        if (typeof value === 'function') {
            nextSort = value(prev.sort);
        } else {
            nextSort = value;
        }

        if (
          nextSort &&
          prev.sort?.key === nextSort.key
        ) {
          if (prev.sort.direction === 'asc') {
            return { ...prev, sort: { ...nextSort, direction: 'desc' }, page: 1 };
          }
          if (prev.sort.direction === 'desc') {
            return { ...prev, sort: null, page: 1 };
          }
        }
        return { ...prev, sort: nextSort, page: 1 };
    });
  };

  return {
    // Data & Loading
    data: vouchers,
    isLoading: isLoading || (isPlaceholderData && vouchers.length === 0),
    isFetching,
    isPlaceholderData,
    totalItems: meta.total,
    totalPages: meta.totalPages,
    
    // State
    currentPage: tableState.page,
    itemsPerPage: tableState.pageSize,
    searchTerm: tableState.search,
    selectedStatuses: tableState.status,
    dateRange: tableState.dateRange,
    sortConfig: tableState.sort,
    locale,
    timezone,
    
    // Actions
    setCurrentPage: handlePageChange,
    setItemsPerPage: handlePageSizeChange,
    setSearchTerm: handleSearchAction,
    setSelectedStatuses: handleFilterAction,
    setDateRange: handleDateRangeAction,
    handleSort,
    handleFilter: handleFilterAction,
    handleDateRangeChange: handleDateRangeAction,
    refetch,
  };
}

import { apiClient, type ApiResult } from '../lib/api-client';
import type { 
  InventoryVoucher, 
  PaginatedResponse, 
  CreateInventoryVoucherDto, 
  UpdateInventoryVoucherDto,
  CancelInventoryVoucherDto,
  ReplaceInventoryVoucherDto,
  ExportInventoryVouchersDto,
  InventoryExcelJobStatus
} from '@repo/types';

const RESOURCE = '/inventory/vouchers';

export const inventoryApi = {
  getVouchers: (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    from?: string;
    to?: string;
    tz?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    ids?: string[];
  } = {}): Promise<ApiResult<InventoryVoucher[]>> => {
    const query = new URLSearchParams();
    if (params.page !== undefined) query.append('page', params.page.toString());
    if (params.limit !== undefined) query.append('limit', params.limit.toString());
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.from) query.append('from', params.from);
    if (params.to) query.append('to', params.to);
    if (params.tz) query.append('tz', params.tz);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);
    if (params.ids !== undefined) query.append('ids', params.ids.join(','));
    
    return apiClient.get(`${RESOURCE}?${query.toString()}`);
  },

  getVoucher: (id: string): Promise<ApiResult<InventoryVoucher>> => {
    return apiClient.get(`${RESOURCE}/${id}`);
  },

  getVoucherTemplate: (): Promise<ApiResult<InventoryVoucher>> => {
    return apiClient.get(`${RESOURCE}/template`);
  },

  createVoucher: (dto: CreateInventoryVoucherDto): Promise<ApiResult<InventoryVoucher>> => {
    return apiClient.post(RESOURCE, dto);
  },

  updateVoucher: (id: string, dto: UpdateInventoryVoucherDto): Promise<ApiResult<InventoryVoucher>> => {
    return apiClient.put(`${RESOURCE}/${id}`, dto);
  },

  deleteVoucher: (id: string): Promise<ApiResult<void>> => {
    return apiClient.delete(`${RESOURCE}/${id}`);
  },

  postVoucher: (id: string): Promise<ApiResult<InventoryVoucher>> => {
    return apiClient.post(`${RESOURCE}/${id}/post`);
  },

  cancelVoucher: (id: string, dto: CancelInventoryVoucherDto): Promise<ApiResult<InventoryVoucher>> => {
    return apiClient.post(`${RESOURCE}/${id}/cancel`, dto);
  },

  replaceVoucher: (id: string, dto: ReplaceInventoryVoucherDto): Promise<ApiResult<InventoryVoucher>> => {
    return apiClient.post(`${RESOURCE}/${id}/replace`, dto);
  },

  exportVouchers: (
    dto: ExportInventoryVouchersDto,
    excelClientId: string,
  ): Promise<ApiResult<InventoryExcelJobStatus>> => {
    return apiClient.post(`${RESOURCE}/export`, dto, {
      headers: { 'X-Excel-Client-Id': excelClientId },
    });
  },

  importVouchers: (
    file: File,
    excelClientId: string,
  ): Promise<ApiResult<InventoryExcelJobStatus>> => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.postMultipart(`${RESOURCE}/import`, fd, {
      headers: { 'X-Excel-Client-Id': excelClientId },
    });
  },

  getExcelJob: (jobId: string): Promise<ApiResult<InventoryExcelJobStatus>> => {
    return apiClient.get(`/inventory/excel-jobs/${jobId}`);
  },
};

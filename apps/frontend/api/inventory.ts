import { apiClient, type ApiResult } from '../lib/api-client';
import type { 
  InventoryVoucher, 
  PaginatedResponse, 
  CreateInventoryVoucherDto, 
  UpdateInventoryVoucherDto,
  CancelInventoryVoucherDto,
  ReplaceInventoryVoucherDto
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
    
    return apiClient.get(`${RESOURCE}?${query.toString()}`);
  },

  // Fetch a single voucher by ID with details
  getVoucher: (id: string): Promise<ApiResult<InventoryVoucher>> => {
    return apiClient.get(`${RESOURCE}/${id}`);
  },

  // Fetch a template with a pre-filled unique voucher number
  getVoucherTemplate: (): Promise<ApiResult<InventoryVoucher>> => {
    return apiClient.get(`${RESOURCE}/template`);
  },

  // Create a new draft voucher
  createVoucher: (dto: CreateInventoryVoucherDto): Promise<ApiResult<InventoryVoucher>> => {
    return apiClient.post(RESOURCE, dto);
  },

  // Update an existing draft voucher
  updateVoucher: (id: string, dto: UpdateInventoryVoucherDto): Promise<ApiResult<InventoryVoucher>> => {
    return apiClient.put(`${RESOURCE}/${id}`, dto);
  },

  // Delete a draft voucher (Hard Delete)
  deleteVoucher: (id: string): Promise<ApiResult<void>> => {
    return apiClient.delete(`${RESOURCE}/${id}`);
  },

  // Post a voucher (Mark as final and immutable)
  postVoucher: (id: string): Promise<ApiResult<InventoryVoucher>> => {
    return apiClient.post(`${RESOURCE}/${id}/post`);
  },

  // Cancel a voucher (Specify reason)
  cancelVoucher: (id: string, dto: CancelInventoryVoucherDto): Promise<ApiResult<InventoryVoucher>> => {
    return apiClient.post(`${RESOURCE}/${id}/cancel`, dto);
  },

  // Replace a cancelled voucher with a new linked draft
  replaceVoucher: (id: string, dto: ReplaceInventoryVoucherDto): Promise<ApiResult<InventoryVoucher>> => {
    return apiClient.post(`${RESOURCE}/${id}/replace`, dto);
  },
};



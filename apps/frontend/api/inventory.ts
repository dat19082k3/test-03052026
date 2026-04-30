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
  // Fetch a paginated list of vouchers
  getVouchers: (page: number = 1, limit: number = 10): Promise<ApiResult<PaginatedResponse<InventoryVoucher>>> => {
    return apiClient.get(`${RESOURCE}?page=${page}&limit=${limit}`);
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



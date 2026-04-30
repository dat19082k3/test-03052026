import { normalizeApiError, type NormalizedApiError } from './api';

const BASE_API_URL = '/api'; // BFF Proxy path

export type ApiResult<T> = 
  | { success: true; data: T }
  | { success: false; error: NormalizedApiError };

/**
 * Standardized Request wrapper using Next.js fetch.
 * Handles JSON parsing and error normalization automatically.
 */
async function request<T>(
  path: string, 
  init?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const url = `${BASE_API_URL}${path}`;
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: normalizeApiError(data) };
    }

    return { success: true, data: data.data };
  } catch (error) {
    return { success: false, error: normalizeApiError(error) };
  }
}

export const apiClient = {
  get: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: 'GET' }),
  post: <T>(path: string, body?: any, init?: RequestInit) => 
    request<T>(path, { ...init, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: any, init?: RequestInit) => 
    request<T>(path, { ...init, method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: 'DELETE' }),
};

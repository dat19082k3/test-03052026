import { normalizeApiError, type NormalizedApiError } from './api';
import { toast } from 'sonner';

const BASE_API_URL = '/api'; // BFF Proxy path

export type ApiResult<T> = 
  | { success: true; data: T; meta?: any }
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
    const headers = new Headers(init?.headers as HeadersInit | undefined);
    const body = init?.body;
    if (!(body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
      ...init,
      headers,
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 429) {
        // Use a simple client-side locale detection
        const locale = typeof document !== 'undefined' 
          ? document.cookie.split('; ').find(row => row.startsWith('NEXT_LOCALE='))?.split('=')[1] || 'vi'
          : 'vi';

        const message = locale === 'en' 
          ? { title: "Too many requests", description: "Please try again later." }
          : { title: "Quá nhiều yêu cầu", description: "Vui lòng thử lại sau ít phút." };

        toast.error(message.title, {
          description: message.description,
        });
        return { success: false, error: { code: 'RATE_LIMIT', fieldErrors: [] } };
      }
      return { success: false, error: normalizeApiError(data) };
    }

    return { 
      success: true, 
      data: data.data !== undefined ? data.data : data,
      meta: data.meta
    };
  } catch (error) {
    return { success: false, error: normalizeApiError(error) };
  }
}

export const apiClient = {
  get: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: 'GET' }),
  post: <T>(path: string, body?: any, init?: RequestInit) => 
    request<T>(path, { 
      ...init, 
      method: 'POST', 
      body: body !== undefined ? JSON.stringify(body) : init?.body,
    }),
  postMultipart: <T>(path: string, formData: FormData, init?: RequestInit) =>
    request<T>(path, { ...init, method: 'POST', body: formData }),
  put: <T>(path: string, body?: any, init?: RequestInit) => 
    request<T>(path, { ...init, method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: 'DELETE' }),
};

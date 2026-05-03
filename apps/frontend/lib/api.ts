import type { ApiErrorResponse, ApiFieldError } from '@repo/types';

/**
 * Normalized error structure for frontend consumption.
 */
export interface NormalizedApiError {
  code: string;
  fieldErrors: ApiFieldError[];
}

/**
 * Normalize a BE API error response into a consistent frontend structure.
 * Handles network errors, unexpected responses, and structured API errors.
 */
export function normalizeApiError(error: unknown): NormalizedApiError {
  // Network / fetch error
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return { code: 'NETWORK', fieldErrors: [] };
  }

  // Structured API error response
  if (isApiErrorResponse(error)) {
    return {
      code: error.code,
      fieldErrors: error.errors ?? [],
    };
  }

  // Rate limit error
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'RATE_LIMIT') {
    return { code: 'RATE_LIMIT', fieldErrors: [] };
  }

  // Unknown error
  return { code: 'UNKNOWN', fieldErrors: [] };
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    (value as any).status === 'error' &&
    'code' in value
  );
}

/**
 * Resolve the top-level error code to an i18n translation key.
 *
 * Error codes from BE use dot notation: "COMMON.NOT_FOUND", "VOUCHER.DUPLICATE_NUMBER"
 * These map to the `errors` namespace: errors.COMMON.NOT_FOUND, errors.VOUCHER.DUPLICATE_NUMBER
 *
 * Special codes "NETWORK" and "UNKNOWN" are top-level keys in the errors namespace.
 */
export function errorCodeToTranslationKey(code: string): string {
  return `errors.${code}`;
}

/**
 * Resolve a field-level validation error to its translation key and params.
 *
 * Field error codes from BE: "VALIDATION.REQUIRED", "VALIDATION.TOO_LONG"
 * These map to the `validation` namespace: validation.REQUIRED, validation.TOO_LONG
 */
export function resolveFieldError(fieldError: ApiFieldError): {
  field: string;
  translationKey: string;
  params: Record<string, string | number>;
} {
  // Strip the "VALIDATION." prefix — field-level codes always use the validation namespace
  const validationKey = fieldError.code.replace(/^VALIDATION\./, '');

  return {
    field: fieldError.field,
    translationKey: `validation.${validationKey}`,
    params: fieldError.params ?? {},
  };
}

/**
 * Resolve all field errors from a normalized API error.
 */
export function resolveFieldErrors(
  fieldErrors: ApiFieldError[],
): Array<{ field: string; translationKey: string; params: Record<string, string | number> }> {
  return fieldErrors.map(resolveFieldError);
}

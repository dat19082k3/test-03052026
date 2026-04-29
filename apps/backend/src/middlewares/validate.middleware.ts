import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';
import { ErrorCode, ApiFieldError } from '@repo/types';

/**
 * Map a Zod issue code to our namespaced error code.
 */
function mapZodIssueToCode(issue: ZodIssue): string {
  const code = issue.code as string;

  switch (code) {
    case 'invalid_type':
      if ((issue as any).expected === 'string' || (issue as any).expected === 'number' || (issue as any).expected === 'array') {
        return ErrorCode.VALIDATION.REQUIRED;
      }
      return ErrorCode.VALIDATION.INVALID_TYPE;
    case 'too_small': {
      const meta = issue as any;
      if (meta.type === 'string' && meta.minimum === 1) return ErrorCode.VALIDATION.NOT_EMPTY;
      if (meta.type === 'array') return ErrorCode.VALIDATION.ARRAY_MIN;
      if (meta.type === 'number' && meta.inclusive && meta.minimum === 0) return ErrorCode.VALIDATION.NON_NEGATIVE_REQUIRED;
      if (meta.type === 'number') return ErrorCode.VALIDATION.POSITIVE_REQUIRED;
      return ErrorCode.VALIDATION.TOO_SHORT;
    }
    case 'too_big':
      return ErrorCode.VALIDATION.TOO_LONG;
    case 'invalid_string': {
      const validation = (issue as any).validation;
      if (validation === 'uuid') return ErrorCode.VALIDATION.INVALID_UUID;
      if (validation === 'regex') return ErrorCode.VALIDATION.INVALID_FORMAT;
      return ErrorCode.VALIDATION.INVALID_FORMAT;
    }
    case 'custom': {
      const msg = issue.message?.toLowerCase() || '';
      if (msg.includes('valid date')) return ErrorCode.VALIDATION.INVALID_DATE;
      if (msg.includes('future')) return ErrorCode.VALIDATION.FUTURE_DATE;
      if (msg.includes('at least one field')) return ErrorCode.VALIDATION.NOT_EMPTY;
      return ErrorCode.VALIDATION.INVALID_FORMAT;
    }
    default:
      return ErrorCode.VALIDATION.INVALID_FORMAT;
  }
}

/**
 * Extract params from a Zod issue for dynamic message interpolation on FE.
 */
function extractParams(issue: ZodIssue): Record<string, string | number> | undefined {
  const params: Record<string, string | number> = {};
  const field = issue.path[issue.path.length - 1];
  if (field !== undefined) params.field = String(field);

  const meta = issue as any;
  if (meta.minimum !== undefined) params.min = meta.minimum;
  if (meta.maximum !== undefined) params.max = meta.maximum;
  if (meta.expected !== undefined) params.expected = String(meta.expected);

  return Object.keys(params).length > 0 ? params : undefined;
}

/**
 * Reusable Express middleware factory for Zod schema validation.
 * Maps Zod errors to namespaced error codes — never exposes raw Zod messages.
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = mapZodErrors(result.error);
      res.status(400).json({
        status: 'error',
        code: ErrorCode.VALIDATION.FAILED,
        errors,
      });
      return;
    }

    req.body = result.data;
    next();
  };
};

/**
 * Map ZodError to ApiFieldError array with custom codes and params.
 */
function mapZodErrors(error: ZodError): ApiFieldError[] {
  return error.issues.map((issue: ZodIssue) => ({
    field: issue.path.join('.'),
    code: mapZodIssueToCode(issue),
    ...(extractParams(issue) && { params: extractParams(issue)! }),
  }));
}

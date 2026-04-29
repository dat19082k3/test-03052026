import { ErrorCodeType, ApiFieldError } from '@repo/types';

export class AppError extends Error {
  public readonly code: ErrorCodeType;
  public readonly statusCode: number;
  public readonly errors?: ApiFieldError[];

  constructor(
    code: ErrorCodeType,
    statusCode: number,
    errors?: ApiFieldError[],
  ) {
    super(code);
    this.code = code;
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

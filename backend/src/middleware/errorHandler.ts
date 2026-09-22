import type { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError('Resource not found', 404));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.name,
        message: err.message,
        details: err.details ?? null,
      },
    });
    return;
  }

  if (err instanceof Error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message || 'Something went wrong',
        details: null,
      },
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unknown error',
      details: null,
    },
  });
}

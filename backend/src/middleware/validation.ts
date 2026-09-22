import type { NextFunction, Request, Response } from 'express';
import type { ParsedQs } from 'qs';
import { z, ZodError } from 'zod';
import { AppError } from './errorHandler.js';

export function validateBody<T>(schema: z.ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new AppError('Validation failed', 400, error.flatten().fieldErrors));
        return;
      }
      next(new AppError('Unexpected validation error', 400));
    }
  };
}

export function validateQuery<T extends ParsedQs>(schema: z.ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as Request['query'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new AppError('Query validation failed', 400, error.flatten().fieldErrors));
        return;
      }
      next(new AppError('Unexpected query validation error', 400));
    }
  };
}

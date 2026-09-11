import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  error?: string;
}

/**
 * Send success response
 */
export function sendSuccess<T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T
): Response {
  return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data,
  } as ApiResponse<T>);
}

/**
 * Send error response
 */
export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  error?: string
): Response {
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    error: error || message,
  } as ApiResponse);
}

/**
 * Send validation error
 */
export function sendValidationError(
  res: Response,
  errors: Record<string, string>
): Response {
  return res.status(400).json({
    success: false,
    statusCode: 400,
    message: 'Validation failed',
    error: 'Validation failed',
    data: errors,
  });
}

/**
 * Common response helpers
 */
export const responses = {
  created: (res: Response, message: string, data?: any) =>
    sendSuccess(res, 201, message, data),
  ok: (res: Response, message: string, data?: any) =>
    sendSuccess(res, 200, message, data),
  noContent: (res: Response) =>
    res.status(204).send(),
  badRequest: (res: Response, message: string) =>
    sendError(res, 400, message),
  unauthorized: (res: Response, message: string = 'Unauthorized') =>
    sendError(res, 401, message),
  forbidden: (res: Response, message: string = 'Forbidden') =>
    sendError(res, 403, message),
  notFound: (res: Response, message: string = 'Not found') =>
    sendError(res, 404, message),
  conflict: (res: Response, message: string) =>
    sendError(res, 409, message),
  internalError: (res: Response, message: string = 'Internal server error') =>
    sendError(res, 500, message),
};
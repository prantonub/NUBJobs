/**
 * Lightweight HTTP-aware error used across the backend.
 *
 * Both Express error handlers (`src/server.ts`, `src/app.ts`) read
 * `err.statusCode`, so throwing one of these from a service/controller is
 * enough to produce the right JSON error response.
 */
export interface HttpError extends Error {
  statusCode: number;
}

export function httpError(statusCode: number, message: string): HttpError {
  const error = new Error(message) as HttpError;
  error.name = 'HttpError';
  error.statusCode = statusCode;
  return error;
}

export function isHttpError(error: unknown): error is HttpError {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { statusCode?: unknown }).statusCode === 'number'
  );
}

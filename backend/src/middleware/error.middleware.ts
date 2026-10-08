import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

export function errorHandler(
  err: Error & { statusCode?: number; code?: string },
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_FAILED');

  // Log detailed error server-side safely without exposing to client
  logger.error(`Error processing ${req.method} ${req.originalUrl}: ${err.message}`, {
    name: err.name,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Client receives a sanitized message, never stack traces or credentials
  const clientMessage =
    statusCode === 500
      ? 'An unexpected internal server error occurred. Please try again later.'
      : err.message || 'Request failed';

  sendError(res, clientMessage, statusCode, errorCode);
}

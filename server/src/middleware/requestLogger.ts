import { randomUUID } from 'node:crypto';
import pinoHttp from 'pino-http';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

// Generate or use existing request ID
export const addRequestId = (req: Request, res: Response, next: NextFunction) => {
  const existingId = req.headers['x-request-id'] as string;
  const requestId = existingId || randomUUID();

  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);

  next();
};

// Determine log level based on status code
const getLogLevel = (statusCode: number) => {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  return 'info';
};

// HTTP request logger middleware
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-request-id'] as string,
  customLogLevel: (_req, res) => getLogLevel(res.statusCode),
  customSuccessMessage: (req) => `${req.method} ${req.url} completed`,
  customErrorMessage: (req, res) => `${req.method} ${req.url} error (${res.statusCode})`,
});

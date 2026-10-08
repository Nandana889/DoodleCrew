import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export function rateLimiter(maxRequests = 60, windowMs = 60000) {
  const ipMap = new Map<string, RateLimitRecord>();

  return (req: Request, res: Response, next: NextFunction): void => {
    // In test environment, do not throttle
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = ipMap.get(ip);

    if (!record || now > record.resetTime) {
      ipMap.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      sendError(
        res,
        'Too many requests. Please slow down and try again later.',
        429,
        'RATE_LIMIT_EXCEEDED',
        { retryAfterSeconds: retryAfter }
      );
      return;
    }

    record.count++;
    next();
  };
}

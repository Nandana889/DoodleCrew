import { config } from '../config';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function sanitize(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitize);

  const sanitized: Record<string, unknown> = {};
  const sensitiveKeys = ['password', 'token', 'authorization', 'secret', 'apikey', 'service_role_key'];

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function log(level: LogLevel, message: string, meta?: unknown) {
  if (config.nodeEnv === 'test' && level === 'debug') return;

  const timestamp = new Date().toISOString();
  const formattedMeta = meta ? ` ${JSON.stringify(sanitize(meta))}` : '';
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (level === 'error') {
    console.error(`${prefix} ${message}${formattedMeta}`);
  } else if (level === 'warn') {
    console.warn(`${prefix} ${message}${formattedMeta}`);
  } else {
    console.log(`${prefix} ${message}${formattedMeta}`);
  }
}

export const logger = {
  info: (msg: string, meta?: unknown) => log('info', msg, meta),
  warn: (msg: string, meta?: unknown) => log('warn', msg, meta),
  error: (msg: string, meta?: unknown) => log('error', msg, meta),
  debug: (msg: string, meta?: unknown) => log('debug', msg, meta),
};

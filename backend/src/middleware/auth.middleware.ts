import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { db } from '../services/db.service';
import { AuthenticatedRequest, AuthUser } from '../types';
import { sendError } from '../utils/response';

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Authentication required: missing or invalid Authorization header', 401, 'UNAUTHORIZED');
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    sendError(res, 'Authentication token missing', 401, 'UNAUTHORIZED');
    return;
  }

  try {
    // 1. First try app JWT verification
    const decoded = jwt.verify(token, config.jwtSecret) as {
      sub?: string;
      id?: string;
      email?: string;
      role?: string;
    };

    const userId = decoded.sub || decoded.id;
    if (!userId) {
      sendError(res, 'Malformed token payload', 401, 'INVALID_TOKEN');
      return;
    }

    const user = await db.getUserById(userId);
    if (!user) {
      sendError(res, 'User account associated with token does not exist', 401, 'USER_NOT_FOUND');
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
    };
    next();
  } catch (jwtErr) {
    // 2. Check if token is mock testing token in test mode: "mock-token-<id>"
    if (config.nodeEnv === 'test' && token.startsWith('mock-token-')) {
      const mockId = token.replace('mock-token-', '');
      const user = await db.getUserById(mockId);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
        };
        next();
        return;
      }
    }

    sendError(res, 'Invalid or expired authentication token', 401, 'INVALID_TOKEN');
  }
}

export async function optionalAuthenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7).trim();
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      sub?: string;
      id?: string;
    };
    const userId = decoded.sub || decoded.id;
    if (userId) {
      const user = await db.getUserById(userId);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
        };
      }
    }
  } catch {
    // Ignore error for optional authentication
  }
  next();
}

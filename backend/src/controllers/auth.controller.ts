import { Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

export class AuthController {
  async register(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);
      sendSuccess(res, result, 201);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      if (msg.includes('already exists')) {
        sendError(res, msg, 409, 'USER_ALREADY_EXISTS');
        return;
      }
      next(err);
    }
  }

  async login(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body);
      sendSuccess(res, result, 200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      if (msg.includes('Invalid email or password')) {
        sendError(res, msg, 401, 'INVALID_CREDENTIALS');
        return;
      }
      next(err);
    }
  }

  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
        return;
      }
      const user = await authService.getProfile(req.user.id);
      if (!user) {
        sendError(res, 'User not found', 404, 'NOT_FOUND');
        return;
      }
      sendSuccess(res, { user });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();

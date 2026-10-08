import { Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';
import { AuthenticatedRequest, ItemStatus } from '../types';
import { sendSuccess, sendError } from '../utils/response';

export class AdminController {
  async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await adminService.getStats();
      sendSuccess(res, { stats });
    } catch (err) {
      next(err);
    }
  }

  async getAllItems(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const items = await adminService.getAllItems();
      sendSuccess(res, { items, count: items.length });
    } catch (err) {
      next(err);
    }
  }

  async overrideStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
        return;
      }

      const { id } = req.params;
      const { status, reason } = req.body as { status: ItemStatus; reason?: string };

      const updated = await adminService.overrideItemStatus(id, status, req.user, reason);
      sendSuccess(res, { item: updated, message: 'Status updated by administrator' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'ITEM_NOT_FOUND') {
        sendError(res, 'Item not found', 404, 'NOT_FOUND');
        return;
      }
      next(err);
    }
  }

  async getAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const auditLogs = await adminService.getAuditLogs();
      sendSuccess(res, { auditLogs, count: auditLogs.length });
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();

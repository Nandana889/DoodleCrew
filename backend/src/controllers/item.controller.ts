import { Response, NextFunction } from 'express';
import { itemService } from '../services/item.service';
import { AuthenticatedRequest, ItemCategory, ItemStatus, ItemType } from '../types';
import { sendSuccess, sendError } from '../utils/response';

export class ItemController {
  async createLost(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Authentication required to report lost item', 401, 'UNAUTHORIZED');
        return;
      }

      const item = await itemService.createLostItem(req.user, req.body);
      sendSuccess(res, { item }, 201);
    } catch (err) {
      next(err);
    }
  }

  async createFound(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Authentication required to report found item', 401, 'UNAUTHORIZED');
        return;
      }

      const item = await itemService.createFoundItem(req.user, req.body);
      sendSuccess(res, { item }, 201);
    } catch (err) {
      next(err);
    }
  }

  async getItems(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { type, category, status, search } = req.query as {
        type?: ItemType;
        category?: ItemCategory;
        status?: ItemStatus;
        search?: string;
      };

      const items = await itemService.getItems({ type, category, status, search }, req.user);
      sendSuccess(res, { items, count: items.length });
    } catch (err) {
      next(err);
    }
  }

  async getMyReports(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
        return;
      }

      const items = await itemService.getMyReports(req.user.id);
      sendSuccess(res, { items, count: items.length });
    } catch (err) {
      next(err);
    }
  }

  async getItemById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const item = await itemService.getItemById(id, req.user);

      if (!item) {
        sendError(res, 'Item report not found', 404, 'ITEM_NOT_FOUND');
        return;
      }

      sendSuccess(res, { item });
    } catch (err) {
      next(err);
    }
  }

  async updateItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
        return;
      }

      const { id } = req.params;
      const isAdmin = req.user.role === 'admin';

      const updated = await itemService.updateItem(id, req.user.id, isAdmin, req.body);
      sendSuccess(res, { item: updated });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'ITEM_NOT_FOUND') {
        sendError(res, 'Item not found', 404, 'NOT_FOUND');
        return;
      }
      if (msg === 'FORBIDDEN_ITEM_MODIFICATION') {
        sendError(res, 'Forbidden: You are not authorized to modify this item', 403, 'FORBIDDEN');
        return;
      }
      if (msg.startsWith('INVALID_STATUS_TRANSITION') || msg.startsWith('FORBIDDEN_STATUS_TRANSITION')) {
        sendError(res, msg, 400, 'INVALID_TRANSITION');
        return;
      }
      next(err);
    }
  }

  async cancelReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
        return;
      }

      const { id } = req.params;
      const isAdmin = req.user.role === 'admin';

      const cancelled = await itemService.cancelReport(id, req.user.id, isAdmin);
      sendSuccess(res, { item: cancelled, message: 'Report successfully cancelled' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'ITEM_NOT_FOUND') {
        sendError(res, 'Item not found', 404, 'NOT_FOUND');
        return;
      }
      if (msg === 'FORBIDDEN_ITEM_CANCELLATION') {
        sendError(res, 'Forbidden: You cannot cancel another user\'s report', 403, 'FORBIDDEN');
        return;
      }
      next(err);
    }
  }
}

export const itemController = new ItemController();

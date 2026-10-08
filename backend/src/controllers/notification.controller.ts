import { Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

export class NotificationController {
  async getNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
        return;
      }

      const notifications = await notificationService.getUserNotifications(req.user.id);
      sendSuccess(res, { notifications, count: notifications.length });
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
        return;
      }

      const { id } = req.params;
      const success = await notificationService.markAsRead(id, req.user.id);
      if (!success) {
        sendError(res, 'Notification not found or access denied', 404, 'NOT_FOUND');
        return;
      }

      sendSuccess(res, { message: 'Notification marked as read' });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationController = new NotificationController();

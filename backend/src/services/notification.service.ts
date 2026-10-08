import { db } from './db.service';
import { AppNotification, NotificationType } from '../types';

export class NotificationService {
  async notifyUser(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
  }): Promise<AppNotification> {
    return db.createNotification({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link,
      read: false,
    });
  }

  async getUserNotifications(userId: string): Promise<AppNotification[]> {
    return db.getNotificationsByUser(userId);
  }

  async markAsRead(id: string, userId: string): Promise<boolean> {
    return db.markNotificationRead(id, userId);
  }
}

export const notificationService = new NotificationService();

import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { uuidParamSchema } from '../validators/item.validator';

const router = Router();

router.get('/', authenticate, notificationController.getNotifications.bind(notificationController));

router.patch(
  '/:id/read',
  authenticate,
  validate(uuidParamSchema, 'params'),
  notificationController.markAsRead.bind(notificationController)
);

export default router;

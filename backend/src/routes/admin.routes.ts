import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { uuidParamSchema } from '../validators/item.validator';

const router = Router();

// All admin routes strictly require authentication and admin role
router.use(authenticate, requireRole('admin'));

router.get('/stats', adminController.getStats.bind(adminController));
router.get('/items', adminController.getAllItems.bind(adminController));
router.patch(
  '/items/:id/status',
  validate(uuidParamSchema, 'params'),
  adminController.overrideStatus.bind(adminController)
);
router.get('/audit-logs', adminController.getAuditLogs.bind(adminController));

export default router;

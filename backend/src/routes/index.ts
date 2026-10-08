import { Router } from 'express';
import authRoutes from './auth.routes';
import itemRoutes from './item.routes';
import matchRoutes from './match.routes';
import claimRoutes from './claim.routes';
import notificationRoutes from './notification.routes';
import adminRoutes from './admin.routes';
import { sendSuccess } from '../utils/response';

const router = Router();

// Health & System Info
router.get('/health', (_req, res) => {
  sendSuccess(res, {
    status: 'healthy',
    service: 'CampusFind API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Mount modules
router.use('/auth', authRoutes);
router.use('/items', itemRoutes);
router.use('/matches', matchRoutes);
router.use('/claims', claimRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

export default router;

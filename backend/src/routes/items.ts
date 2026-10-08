import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { createItem, getMyItems, getActiveItems } from '../controllers/itemController';

const router = Router();

router.use(requireAuth);

router.post('/', createItem);
router.get('/me', getMyItems);
router.get('/active', getActiveItems);

export default router;

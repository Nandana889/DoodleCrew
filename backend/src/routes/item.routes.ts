import { Router } from 'express';
import { itemController } from '../controllers/item.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createLostItemSchema,
  createFoundItemSchema,
  updateItemSchema,
  itemQuerySchema,
  uuidParamSchema,
} from '../validators/item.validator';

const router = Router();

// Public item discovery with privacy masking
router.get(
  '/',
  optionalAuthenticate,
  validate(itemQuerySchema, 'query'),
  itemController.getItems.bind(itemController)
);

// Protected: Get user's own reports
router.get('/my', authenticate, itemController.getMyReports.bind(itemController));

// Get single item details (with privacy masking for non-owners)
router.get(
  '/:id',
  optionalAuthenticate,
  validate(uuidParamSchema, 'params'),
  itemController.getItemById.bind(itemController)
);

// Protected: Report lost item
router.post(
  '/lost',
  authenticate,
  validate(createLostItemSchema, 'body'),
  itemController.createLost.bind(itemController)
);

// Protected: Report found item
router.post(
  '/found',
  authenticate,
  validate(createFoundItemSchema, 'body'),
  itemController.createFound.bind(itemController)
);

// Protected: Update report (IDOR protected in service)
router.patch(
  '/:id',
  authenticate,
  validate(uuidParamSchema, 'params'),
  validate(updateItemSchema, 'body'),
  itemController.updateItem.bind(itemController)
);

// Protected: Cancel report (IDOR protected in service)
router.delete(
  '/:id',
  authenticate,
  validate(uuidParamSchema, 'params'),
  itemController.cancelReport.bind(itemController)
);

router.post(
  '/:id/cancel',
  authenticate,
  validate(uuidParamSchema, 'params'),
  itemController.cancelReport.bind(itemController)
);

export default router;

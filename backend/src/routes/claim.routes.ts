import { Router } from 'express';
import { claimController } from '../controllers/claim.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { rateLimiter } from '../middleware/rateLimiter.middleware';
import { submitClaimSchema, updateClaimStatusSchema } from '../validators/claim.validator';
import { uuidParamSchema } from '../validators/item.validator';

const router = Router();

// Submit an ownership claim for a found item
router.post(
  '/',
  authenticate,
  rateLimiter(15, 60000),
  validate(submitClaimSchema, 'body'),
  claimController.submitClaim.bind(claimController)
);

// Get claims (user's claims, or finder's claims for their item)
router.get('/', authenticate, claimController.getClaims.bind(claimController));

// Get claim details by ID (IDOR protected in service)
router.get(
  '/:id',
  authenticate,
  validate(uuidParamSchema, 'params'),
  claimController.getClaimById.bind(claimController)
);

// Review claim (approve or reject by finder or admin)
router.patch(
  '/:id/review',
  authenticate,
  validate(uuidParamSchema, 'params'),
  validate(updateClaimStatusSchema, 'body'),
  claimController.reviewClaim.bind(claimController)
);

export default router;

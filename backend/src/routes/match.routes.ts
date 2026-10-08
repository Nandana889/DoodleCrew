import { Router } from 'express';
import { matchController } from '../controllers/match.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { uuidParamSchema } from '../validators/item.validator';
import { aiCandidateRequestSchema } from '../validators/ai.validator';

const router = Router();

// Get matches for authenticated user
router.get('/', authenticate, matchController.getMyMatches.bind(matchController));

// Get match by id (IDOR protected in service)
router.get(
  '/:id',
  authenticate,
  validate(uuidParamSchema, 'params'),
  matchController.getMatchById.bind(matchController)
);

// Dismiss match
router.post(
  '/:id/dismiss',
  authenticate,
  validate(uuidParamSchema, 'params'),
  matchController.dismissMatch.bind(matchController)
);

// Direct AI match evaluation endpoint for pipeline testing & preview
router.post(
  '/evaluate',
  authenticate,
  validate(aiCandidateRequestSchema, 'body'),
  matchController.evaluateMatch.bind(matchController)
);

export default router;

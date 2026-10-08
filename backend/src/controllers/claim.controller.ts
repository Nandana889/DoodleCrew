import { Response, NextFunction } from 'express';
import { claimService } from '../services/claim.service';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

export class ClaimController {
  async submitClaim(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Authentication required to submit an ownership claim', 401, 'UNAUTHORIZED');
        return;
      }

      const claim = await claimService.submitClaim(req.user, req.body);
      sendSuccess(res, { claim, message: 'Ownership claim submitted successfully for verification' }, 201);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'ITEM_NOT_FOUND') {
        sendError(res, 'Target found item was not found', 404, 'ITEM_NOT_FOUND');
        return;
      }
      if (msg.startsWith('INVALID_CLAIM_TARGET') || msg.startsWith('ITEM_ALREADY_RESOLVED')) {
        sendError(res, msg, 400, 'INVALID_CLAIM');
        return;
      }
      if (msg.startsWith('SELF_CLAIM_FORBIDDEN')) {
        sendError(res, msg, 403, 'SELF_CLAIM_FORBIDDEN');
        return;
      }
      if (msg.startsWith('DUPLICATE_CLAIM')) {
        sendError(res, 'You have already submitted an active claim for this item', 409, 'DUPLICATE_CLAIM');
        return;
      }
      if (msg.startsWith('UNAUTHORIZED_MATCH_CLAIM')) {
        sendError(res, 'Forbidden: You do not own the lost item associated with this match', 403, 'FORBIDDEN');
        return;
      }
      next(err);
    }
  }

  async getClaims(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
        return;
      }

      const { itemId } = req.query as { itemId?: string };
      const claims = await claimService.getClaims(req.user, itemId);
      sendSuccess(res, { claims, count: claims.length });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'ITEM_NOT_FOUND') {
        sendError(res, 'Item not found', 404, 'ITEM_NOT_FOUND');
        return;
      }
      next(err);
    }
  }

  async getClaimById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
        return;
      }

      const { id } = req.params;
      const claim = await claimService.getClaimById(id, req.user);

      if (!claim) {
        sendError(res, 'Claim not found', 404, 'CLAIM_NOT_FOUND');
        return;
      }

      sendSuccess(res, { claim });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'FORBIDDEN_CLAIM_ACCESS') {
        sendError(res, 'Forbidden: You are not authorized to view this claim', 403, 'FORBIDDEN');
        return;
      }
      next(err);
    }
  }

  async reviewClaim(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
        return;
      }

      const { id } = req.params;
      const { status, reviewNotes } = req.body;

      const updatedClaim = await claimService.reviewClaim(id, req.user, status, reviewNotes);
      sendSuccess(res, { claim: updatedClaim, message: `Claim successfully ${status}` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'CLAIM_NOT_FOUND' || msg === 'ITEM_NOT_FOUND') {
        sendError(res, 'Claim or associated item not found', 404, 'NOT_FOUND');
        return;
      }
      if (msg.startsWith('SELF_REVIEW_FORBIDDEN') || msg.startsWith('FORBIDDEN_CLAIM_REVIEW')) {
        sendError(res, msg, 403, 'FORBIDDEN');
        return;
      }
      if (msg.startsWith('CLAIM_ALREADY_DECIDED')) {
        sendError(res, msg, 400, 'ALREADY_DECIDED');
        return;
      }
      next(err);
    }
  }
}

export const claimController = new ClaimController();

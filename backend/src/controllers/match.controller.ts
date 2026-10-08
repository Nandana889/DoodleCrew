import { Response, NextFunction } from 'express';
import { matchService } from '../services/match.service';
import { db } from '../services/db.service';
import { aiService } from '../services/ai.service';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

export class MatchController {
  async getMyMatches(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
        return;
      }

      const matches = await matchService.getUserMatches(req.user.id);
      sendSuccess(res, { matches, count: matches.length });
    } catch (err) {
      next(err);
    }
  }

  async getMatchById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
        return;
      }

      const { id } = req.params;
      const isAdmin = req.user.role === 'admin';

      const match = await matchService.getMatchById(id, req.user.id, isAdmin);
      if (!match) {
        sendError(res, 'Match record not found', 404, 'NOT_FOUND');
        return;
      }

      sendSuccess(res, { match });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'FORBIDDEN_MATCH_ACCESS') {
        sendError(res, 'Forbidden: You do not own the items associated with this match', 403, 'FORBIDDEN');
        return;
      }
      next(err);
    }
  }

  async dismissMatch(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
        return;
      }

      const { id } = req.params;
      const isAdmin = req.user.role === 'admin';

      const match = await matchService.dismissMatch(id, req.user.id, isAdmin);
      sendSuccess(res, { match, message: 'Match dismissed' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'FORBIDDEN_MATCH_ACCESS') {
        sendError(res, 'Forbidden: You cannot dismiss this match', 403, 'FORBIDDEN');
        return;
      }
      next(err);
    }
  }

  /**
   * Direct integration endpoint for testing AI match between any two specific items.
   * Useful for frontend match previews and Member 4's AI pipeline testing.
   */
  async evaluateMatch(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { lostItemId, foundItemId } = req.body;

      const lostItem = await db.getItemById(lostItemId);
      const foundItem = await db.getItemById(foundItemId);

      if (!lostItem || !foundItem) {
        sendError(res, 'One or both items could not be found', 404, 'ITEM_NOT_FOUND');
        return;
      }

      const result = await aiService.matchItems(lostItem, foundItem);
      sendSuccess(res, { matchEvaluation: result });
    } catch (err) {
      next(err);
    }
  }
}

export const matchController = new MatchController();

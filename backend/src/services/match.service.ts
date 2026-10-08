import { db } from './db.service';
import { aiService } from './ai.service';
import { notificationService } from './notification.service';
import { Item, MatchRecord } from '../types';
import { logger } from '../utils/logger';

export class MatchService {
  /**
   * Automatically discovers candidate matches for a newly reported item
   * and runs AI-based similarity comparison.
   */
  async findMatchesForNewItem(newItem: Item): Promise<MatchRecord[]> {
    const isLost = newItem.type === 'lost';
    const candidateType = isLost ? 'found' : 'lost';

    // Retrieve candidates with matching category and active status
    const candidates = await db.getItems({
      type: candidateType,
      category: newItem.category,
      excludeUserId: newItem.userId, // Don't match user's own items
    });

    const activeCandidates = candidates.filter(
      (c) => c.status === 'reported' || c.status === 'potential_match'
    );

    const createdMatches: MatchRecord[] = [];

    for (const candidate of activeCandidates) {
      const lostItem = isLost ? newItem : candidate;
      const foundItem = isLost ? candidate : newItem;

      try {
        const result = await aiService.matchItems(lostItem, foundItem);

        // Threshold for potential match is 50%
        if (result.similarityScore >= 50) {
          const matchRecord = await db.createMatch({
            lostItemId: lostItem.id,
            foundItemId: foundItem.id,
            similarityScore: result.similarityScore,
            confidence: result.confidence,
            matchedAttributes: result.matchedAttributes,
            reasons: result.reasons,
            status: 'pending',
          });

          createdMatches.push(matchRecord);

          // Update statuses to potential_match if currently 'reported'
          if (lostItem.status === 'reported') {
            await db.updateItem(lostItem.id, { status: 'potential_match' });
          }
          if (foundItem.status === 'reported') {
            await db.updateItem(foundItem.id, { status: 'potential_match' });
          }

          // Send notifications
          await notificationService.notifyUser({
            userId: lostItem.userId,
            type: 'match_found',
            title: 'Potential Match Found!',
            message: `A found ${foundItem.category} matching your lost "${lostItem.title}" was reported (${result.similarityScore}% similarity).`,
            link: `/matches/${matchRecord.id}`,
          });

          await notificationService.notifyUser({
            userId: foundItem.userId,
            type: 'match_found',
            title: 'Potential Match Found!',
            message: `A lost ${lostItem.category} matching your found "${foundItem.title}" was reported (${result.similarityScore}% similarity).`,
            link: `/matches/${matchRecord.id}`,
          });
        }
      } catch (err) {
        logger.error(`Error comparing items ${lostItem.id} and ${foundItem.id}`, { error: err });
      }
    }

    return createdMatches;
  }

  async getUserMatches(userId: string): Promise<MatchRecord[]> {
    return db.getMatchesForUser(userId);
  }

  async getMatchById(matchId: string, userId: string, isAdmin = false): Promise<MatchRecord | null> {
    const match = await db.getMatchById(matchId);
    if (!match) return null;

    const lostItem = await db.getItemById(match.lostItemId);
    const foundItem = await db.getItemById(match.foundItemId);

    // IDOR check: only lost-item owner, found-item owner, or admin can access match details
    if (!isAdmin && lostItem?.userId !== userId && foundItem?.userId !== userId) {
      throw new Error('FORBIDDEN_MATCH_ACCESS');
    }

    return {
      ...match,
      lostItem: lostItem || undefined,
      foundItem: foundItem || undefined,
    };
  }

  async dismissMatch(matchId: string, userId: string, isAdmin = false): Promise<MatchRecord> {
    const match = await this.getMatchById(matchId, userId, isAdmin);
    if (!match) {
      throw new Error('Match not found');
    }

    const updated = await db.updateMatchStatus(matchId, 'dismissed');
    if (!updated) {
      throw new Error('Failed to update match status');
    }
    return updated;
  }
}

export const matchService = new MatchService();

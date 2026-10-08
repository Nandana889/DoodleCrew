import { db } from './db.service';
import { notificationService } from './notification.service';
import { Claim, ClaimVerificationDetails, AuthUser } from '../types';

export class ClaimService {
  /**
   * Submits a formal claim with private ownership verification details.
   * AI similarity alone does NOT establish ownership.
   */
  async submitClaim(
    claimant: AuthUser,
    data: {
      itemId: string;
      matchId?: string;
      verificationDetails: ClaimVerificationDetails;
    }
  ): Promise<Claim> {
    const item = await db.getItemById(data.itemId);
    if (!item) {
      throw new Error('ITEM_NOT_FOUND');
    }

    // Only found items can be claimed
    if (item.type !== 'found') {
      throw new Error('INVALID_CLAIM_TARGET: Only found items can be claimed');
    }

    // Resolved items cannot be claimed
    if (item.status === 'returned' || item.status === 'closed') {
      throw new Error('ITEM_ALREADY_RESOLVED: This item has already been returned or closed');
    }

    // User cannot claim an item they reported finding
    if (item.userId === claimant.id) {
      throw new Error('SELF_CLAIM_FORBIDDEN: You cannot submit an ownership claim on an item you reported finding');
    }

    // Check for existing active claim by the same user
    const existingClaims = await db.getClaimsByClaimant(claimant.id);
    const alreadyClaimed = existingClaims.some(
      (c) => c.itemId === item.id && (c.status === 'submitted' || c.status === 'under_review' || c.status === 'approved')
    );
    if (alreadyClaimed) {
      throw new Error('DUPLICATE_CLAIM: You already have an active claim for this item');
    }

    // If matchId provided, verify it belongs to claimant's lost item
    if (data.matchId) {
      const match = await db.getMatchById(data.matchId);
      if (!match) {
        throw new Error('MATCH_NOT_FOUND');
      }
      if (match.foundItemId !== item.id) {
        throw new Error('MISMATCHED_CLAIM_TARGET: Match does not correspond to this found item');
      }
      const lostItem = await db.getItemById(match.lostItemId);
      if (lostItem && lostItem.userId !== claimant.id && claimant.role !== 'admin') {
        throw new Error('UNAUTHORIZED_MATCH_CLAIM: You do not own the lost item associated with this match');
      }
    }

    const claim = await db.createClaim({
      itemId: item.id,
      matchId: data.matchId,
      claimantId: claimant.id,
      status: 'submitted',
      verificationDetails: data.verificationDetails,
    });

    // Advance item lifecycle to verification_pending
    if (item.status !== 'verification_pending') {
      await db.updateItem(item.id, { status: 'verification_pending' });
    }

    // Notify item finder / custodian
    await notificationService.notifyUser({
      userId: item.userId,
      type: 'claim_submitted',
      title: 'New Ownership Claim Submitted',
      message: `${claimant.name} has submitted an ownership claim for "${item.title}". Review their verification details.`,
      link: `/claims/${claim.id}`,
    });

    return claim;
  }

  async getClaims(user: AuthUser, itemId?: string): Promise<Claim[]> {
    if (itemId) {
      const item = await db.getItemById(itemId);
      if (!item) throw new Error('ITEM_NOT_FOUND');

      // Only finder of the item, claimant, or staff/admin can view claims for this item
      const isFinder = item.userId === user.id;
      const isStaffOrAdmin = user.role === 'admin' || user.role === 'staff';

      if (!isFinder && !isStaffOrAdmin) {
        // Return only claimant's own claims for this item
        const claimantClaims = await db.getClaimsByClaimant(user.id);
        return claimantClaims.filter((c) => c.itemId === itemId);
      }

      return db.getClaimsByItem(itemId);
    }

    // If no itemId: admins see all claims, regular users see only their own submitted claims
    if (user.role === 'admin' || user.role === 'staff') {
      const allItems = await db.getItems();
      const allClaims: Claim[] = [];
      for (const item of allItems) {
        const claims = await db.getClaimsByItem(item.id);
        allClaims.push(...claims);
      }
      return allClaims;
    }

    return db.getClaimsByClaimant(user.id);
  }

  async getClaimById(claimId: string, user: AuthUser): Promise<Claim | null> {
    const claim = await db.getClaimById(claimId);
    if (!claim) return null;

    const item = await db.getItemById(claim.itemId);
    const isClaimant = claim.claimantId === user.id;
    const isFinder = item?.userId === user.id;
    const isStaffOrAdmin = user.role === 'admin' || user.role === 'staff';

    // IDOR check
    if (!isClaimant && !isFinder && !isStaffOrAdmin) {
      throw new Error('FORBIDDEN_CLAIM_ACCESS');
    }

    return claim;
  }

  async reviewClaim(
    claimId: string,
    reviewer: AuthUser,
    status: 'approved' | 'rejected',
    reviewNotes?: string
  ): Promise<Claim> {
    const claim = await db.getClaimById(claimId);
    if (!claim) throw new Error('CLAIM_NOT_FOUND');

    const item = await db.getItemById(claim.itemId);
    if (!item) throw new Error('ITEM_NOT_FOUND');

    const isFinder = item.userId === reviewer.id;
    const isStaffOrAdmin = reviewer.role === 'admin' || reviewer.role === 'staff';

    // Claimant cannot review their own claim
    if (claim.claimantId === reviewer.id && !isStaffOrAdmin) {
      throw new Error('SELF_REVIEW_FORBIDDEN: You cannot review your own claim');
    }

    if (!isFinder && !isStaffOrAdmin) {
      throw new Error('FORBIDDEN_CLAIM_REVIEW: Only the finder or staff/admin can review claims');
    }

    if (claim.status === 'approved' || claim.status === 'rejected') {
      throw new Error(`CLAIM_ALREADY_DECIDED: Claim is already ${claim.status}`);
    }

    const updatedClaim = await db.updateClaim(claimId, {
      status,
      reviewerId: reviewer.id,
      reviewNotes,
    });

    if (!updatedClaim) throw new Error('CLAIM_UPDATE_FAILED');

    if (status === 'approved') {
      // 1. Mark found item as confirmed_match
      await db.updateItem(item.id, { status: 'confirmed_match' });

      // 2. If claim references an AI match, mark match as verified
      if (claim.matchId) {
        await db.updateMatchStatus(claim.matchId, 'verified');
        const match = await db.getMatchById(claim.matchId);
        if (match) {
          await db.updateItem(match.lostItemId, { status: 'confirmed_match' });
        }
      }

      // 3. Reject other pending claims for this item
      const otherClaims = await db.getClaimsByItem(item.id);
      for (const other of otherClaims) {
        if (other.id !== claimId && (other.status === 'submitted' || other.status === 'under_review')) {
          await db.updateClaim(other.id, {
            status: 'rejected',
            reviewerId: reviewer.id,
            reviewNotes: 'Another verified claim was approved for this item.',
          });
          await notificationService.notifyUser({
            userId: other.claimantId,
            type: 'claim_reviewed',
            title: 'Claim Update',
            message: `Another claim was verified for "${item.title}". Your claim has been closed.`,
          });
        }
      }

      // 4. Notify claimant of approval
      await notificationService.notifyUser({
        userId: claim.claimantId,
        type: 'claim_reviewed',
        title: 'Claim Approved!',
        message: `Your ownership claim for "${item.title}" was approved! Please proceed to the collection desk: ${
          item.storageLocation || 'Campus Security Office'
        }.`,
        link: `/claims/${claim.id}`,
      });
    } else {
      // Rejection handling
      const otherClaims = await db.getClaimsByItem(item.id);
      const remainingPending = otherClaims.filter(
        (c) => c.id !== claimId && (c.status === 'submitted' || c.status === 'under_review')
      );

      // If no other pending claims, revert item back to potential_match or reported
      if (remainingPending.length === 0) {
        await db.updateItem(item.id, { status: 'reported' });
      }

      await notificationService.notifyUser({
        userId: claim.claimantId,
        type: 'claim_reviewed',
        title: 'Claim Not Approved',
        message: `Your ownership claim for "${item.title}" was not approved. Notes: ${reviewNotes || 'Insufficient verification proof.'}`,
        link: `/claims/${claim.id}`,
      });
    }

    return updatedClaim;
  }
}

export const claimService = new ClaimService();

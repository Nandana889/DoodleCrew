import { db } from './db.service';
import { matchService } from './match.service';
import { Item, PublicItem, ItemType, ItemCategory, ItemStatus, AuthUser } from '../types';

// State machine definition for valid status transitions
const ALLOWED_STATUS_TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
  reported: ['potential_match', 'verification_pending', 'closed'],
  potential_match: ['verification_pending', 'reported', 'closed'],
  verification_pending: ['confirmed_match', 'potential_match', 'reported', 'closed'],
  confirmed_match: ['returned', 'closed'],
  returned: ['closed'],
  closed: [], // terminal state
};

export class ItemService {
  /**
   * Sanitizes item for public viewing, masking private contact info
   * unless the viewer is the item creator or an admin.
   */
  sanitizeItem(item: Item, user?: AuthUser): PublicItem {
    const isOwner = user?.id === item.userId;
    const isAdmin = user?.role === 'admin';

    if (isOwner || isAdmin) {
      return { ...item, isOwner };
    }

    // Mask private contact info for external viewers to protect privacy
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { contactInfo, ...publicData } = item;
    return { ...publicData, isOwner: false };
  }

  async createLostItem(
    user: AuthUser,
    data: {
      title: string;
      description: string;
      category: ItemCategory;
      color?: string[];
      features?: string[];
      location: string;
      eventDate: string;
      imageUrl?: string;
      contactInfo?: string;
    }
  ): Promise<Item> {
    const item = await db.createItem({
      type: 'lost',
      title: data.title,
      description: data.description,
      category: data.category,
      color: data.color || [],
      features: data.features || [],
      location: data.location,
      eventDate: data.eventDate,
      imageUrl: data.imageUrl,
      contactInfo: data.contactInfo,
      status: 'reported',
      userId: user.id,
      reporterName: user.name,
    });

    // Run AI candidate matching asynchronously in background
    matchService.findMatchesForNewItem(item).catch(() => {});

    return item;
  }

  async createFoundItem(
    user: AuthUser,
    data: {
      title: string;
      description: string;
      category: ItemCategory;
      color?: string[];
      features?: string[];
      location: string;
      eventDate: string;
      imageUrl?: string;
      storageLocation?: string;
    }
  ): Promise<Item> {
    const item = await db.createItem({
      type: 'found',
      title: data.title,
      description: data.description,
      category: data.category,
      color: data.color || [],
      features: data.features || [],
      location: data.location,
      eventDate: data.eventDate,
      imageUrl: data.imageUrl,
      storageLocation: data.storageLocation,
      status: 'reported',
      userId: user.id,
      reporterName: user.name,
    });

    // Run AI candidate matching asynchronously in background
    matchService.findMatchesForNewItem(item).catch(() => {});

    return item;
  }

  async getItems(
    filter?: {
      type?: ItemType;
      category?: ItemCategory;
      status?: ItemStatus;
      search?: string;
    },
    user?: AuthUser
  ): Promise<PublicItem[]> {
    const items = await db.getItems(filter);
    return items.map((item) => this.sanitizeItem(item, user));
  }

  async getMyReports(userId: string): Promise<Item[]> {
    return db.getItems({ userId });
  }

  async getItemById(id: string, user?: AuthUser): Promise<PublicItem | null> {
    const item = await db.getItemById(id);
    if (!item) return null;
    return this.sanitizeItem(item, user);
  }

  async updateItem(
    id: string,
    userId: string,
    isAdmin: boolean,
    updates: Partial<Item>
  ): Promise<Item> {
    const item = await db.getItemById(id);
    if (!item) {
      throw new Error('ITEM_NOT_FOUND');
    }

    // IDOR Protection: only item creator or admin may modify report
    if (!isAdmin && item.userId !== userId) {
      throw new Error('FORBIDDEN_ITEM_MODIFICATION');
    }

    // Status transition validation
    if (updates.status && updates.status !== item.status) {
      const allowedNext = ALLOWED_STATUS_TRANSITIONS[item.status] || [];
      if (!isAdmin && !allowedNext.includes(updates.status)) {
        throw new Error(
          `INVALID_STATUS_TRANSITION: Cannot transition from '${item.status}' to '${updates.status}'`
        );
      }

      // Restrict arbitrary leap to confirmed_match or returned by normal users
      if (!isAdmin && (updates.status === 'confirmed_match' || updates.status === 'returned')) {
        throw new Error(
          'FORBIDDEN_STATUS_TRANSITION: Setting confirmed_match or returned requires verification workflow or admin role'
        );
      }
    }

    const updated = await db.updateItem(id, updates);
    if (!updated) {
      throw new Error('ITEM_UPDATE_FAILED');
    }
    return updated;
  }

  async cancelReport(id: string, userId: string, isAdmin: boolean): Promise<Item> {
    const item = await db.getItemById(id);
    if (!item) {
      throw new Error('ITEM_NOT_FOUND');
    }

    // IDOR Protection: only creator or admin can cancel
    if (!isAdmin && item.userId !== userId) {
      throw new Error('FORBIDDEN_ITEM_CANCELLATION');
    }

    const updated = await db.updateItem(id, { status: 'closed' });
    if (!updated) {
      throw new Error('ITEM_CANCEL_FAILED');
    }
    return updated;
  }
}

export const itemService = new ItemService();

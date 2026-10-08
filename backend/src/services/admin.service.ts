import { db, AuditLogEntry } from './db.service';
import { Item, ItemStatus, AuthUser } from '../types';

export interface AdminStats {
  totalItems: number;
  lostItems: number;
  foundItems: number;
  returnedItems: number;
  closedItems: number;
  activeMatches: number;
  totalClaims: number;
}

export class AdminService {
  async getStats(): Promise<AdminStats> {
    const items = await db.getItems();
    const lost = items.filter((i) => i.type === 'lost').length;
    const found = items.filter((i) => i.type === 'found').length;
    const returned = items.filter((i) => i.status === 'returned').length;
    const closed = items.filter((i) => i.status === 'closed').length;

    let totalClaimsCount = 0;
    for (const item of items) {
      const claims = await db.getClaimsByItem(item.id);
      totalClaimsCount += claims.length;
    }

    return {
      totalItems: items.length,
      lostItems: lost,
      foundItems: found,
      returnedItems: returned,
      closedItems: closed,
      activeMatches: 0,
      totalClaims: totalClaimsCount,
    };
  }

  async getAllItems(): Promise<Item[]> {
    return db.getItems();
  }

  async overrideItemStatus(
    itemId: string,
    status: ItemStatus,
    adminUser: AuthUser,
    reason?: string
  ): Promise<Item> {
    const item = await db.getItemById(itemId);
    if (!item) throw new Error('ITEM_NOT_FOUND');

    const previousStatus = item.status;
    const updated = await db.updateItem(itemId, { status });
    if (!updated) throw new Error('UPDATE_FAILED');

    // Create audit log entry for administrative override
    await db.createAuditLog({
      userId: adminUser.id,
      action: 'ADMIN_OVERRIDE_ITEM_STATUS',
      targetType: 'item',
      targetId: itemId,
      details: {
        previousStatus,
        newStatus: status,
        reason: reason || 'Administrative action',
      },
    });

    return updated;
  }

  async getAuditLogs(): Promise<AuditLogEntry[]> {
    return db.getAuditLogs();
  }
}

export const adminService = new AdminService();

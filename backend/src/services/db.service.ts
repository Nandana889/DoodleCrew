import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import {
  Item,
  MatchRecord,
  Claim,
  AppNotification,
  AuthUser,
  ItemType,
  ItemCategory,
  ItemStatus,
  MatchStatus,
  ClaimStatus,
} from '../types';
import { logger } from '../utils/logger';

export interface AuditLogEntry {
  id: string;
  userId?: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export class DatabaseService {
  private supabase: SupabaseClient | null = null;
  private users: Map<string, AuthUser & { passwordHash?: string }> = new Map();
  private items: Map<string, Item> = new Map();
  private matches: Map<string, MatchRecord> = new Map();
  private claims: Map<string, Claim> = new Map();
  private notifications: Map<string, AppNotification> = new Map();
  private auditLogs: AuditLogEntry[] = [];

  constructor() {
    if (config.supabase.url && (config.supabase.serviceRoleKey || config.supabase.anonKey)) {
      try {
        const key = config.supabase.serviceRoleKey || config.supabase.anonKey;
        this.supabase = createClient(config.supabase.url, key);
        logger.info('Supabase client initialized');
      } catch (err) {
        logger.warn('Failed to initialize Supabase client, using in-memory store', { error: err });
      }
    } else {
      logger.info('No Supabase credentials provided, running in self-contained store mode');
    }
  }

  // --- Users ---
  async createUser(user: Omit<AuthUser, 'id'> & { id?: string; passwordHash?: string }): Promise<AuthUser> {
    const id = user.id || uuidv4();
    const newUser: AuthUser & { passwordHash?: string } = {
      id,
      email: user.email.toLowerCase().trim(),
      name: user.name.trim(),
      role: user.role,
      department: user.department,
      passwordHash: user.passwordHash,
    };
    this.users.set(id, newUser);
    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      department: newUser.department,
    };
  }

  async getUserById(id: string): Promise<(AuthUser & { passwordHash?: string }) | null> {
    return this.users.get(id) || null;
  }

  async getUserByEmail(email: string): Promise<(AuthUser & { passwordHash?: string }) | null> {
    const normalized = email.toLowerCase().trim();
    for (const user of this.users.values()) {
      if (user.email === normalized) return user;
    }
    return null;
  }

  // --- Items ---
  async createItem(item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Item> {
    const now = new Date().toISOString();
    const id = item.id || uuidv4();
    const newItem: Item = {
      ...item,
      id,
      status: item.status || 'reported',
      color: item.color || [],
      features: item.features || [],
      createdAt: now,
      updatedAt: now,
    };
    this.items.set(id, newItem);
    return newItem;
  }

  async getItemById(id: string): Promise<Item | null> {
    return this.items.get(id) || null;
  }

  async getItems(filter?: {
    type?: ItemType;
    category?: ItemCategory;
    status?: ItemStatus;
    userId?: string;
    excludeUserId?: string;
    search?: string;
  }): Promise<Item[]> {
    let results = Array.from(this.items.values());

    if (filter?.type) {
      results = results.filter((i) => i.type === filter.type);
    }
    if (filter?.category) {
      results = results.filter((i) => i.category === filter.category);
    }
    if (filter?.status) {
      results = results.filter((i) => i.status === filter.status);
    }
    if (filter?.userId) {
      results = results.filter((i) => i.userId === filter.userId);
    }
    if (filter?.excludeUserId) {
      results = results.filter((i) => i.userId !== filter.excludeUserId);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      results = results.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.location.toLowerCase().includes(q)
      );
    }

    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateItem(id: string, updates: Partial<Item>): Promise<Item | null> {
    const item = this.items.get(id);
    if (!item) return null;

    const updated: Item = {
      ...item,
      ...updates,
      id: item.id, // prevent ID change
      userId: item.userId, // prevent owner change
      createdAt: item.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.items.set(id, updated);
    return updated;
  }

  async deleteItem(id: string): Promise<boolean> {
    return this.items.delete(id);
  }

  // --- Matches ---
  async createMatch(match: Omit<MatchRecord, 'id' | 'createdAt'> & { id?: string }): Promise<MatchRecord> {
    // Check if duplicate match already exists between these two items
    for (const existing of this.matches.values()) {
      if (existing.lostItemId === match.lostItemId && existing.foundItemId === match.foundItemId) {
        return existing;
      }
    }

    const id = match.id || uuidv4();
    const newMatch: MatchRecord = {
      ...match,
      id,
      status: match.status || 'pending',
      createdAt: new Date().toISOString(),
    };
    this.matches.set(id, newMatch);
    return newMatch;
  }

  async getMatchById(id: string): Promise<MatchRecord | null> {
    return this.matches.get(id) || null;
  }

  async getMatchesByItem(itemId: string): Promise<MatchRecord[]> {
    return Array.from(this.matches.values()).filter(
      (m) => m.lostItemId === itemId || m.foundItemId === itemId
    );
  }

  async getMatchesForUser(userId: string): Promise<MatchRecord[]> {
    const userItemIds = new Set(
      Array.from(this.items.values())
        .filter((i) => i.userId === userId)
        .map((i) => i.id)
    );

    const matches = Array.from(this.matches.values()).filter(
      (m) => userItemIds.has(m.lostItemId) || userItemIds.has(m.foundItemId)
    );

    // Hydrate with item details
    return matches.map((m) => ({
      ...m,
      lostItem: this.items.get(m.lostItemId),
      foundItem: this.items.get(m.foundItemId),
    }));
  }

  async updateMatchStatus(id: string, status: MatchStatus): Promise<MatchRecord | null> {
    const match = this.matches.get(id);
    if (!match) return null;
    match.status = status;
    return match;
  }

  // --- Claims ---
  async createClaim(claim: Omit<Claim, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Claim> {
    const now = new Date().toISOString();
    const id = claim.id || uuidv4();
    const newClaim: Claim = {
      ...claim,
      id,
      status: claim.status || 'submitted',
      createdAt: now,
      updatedAt: now,
    };
    this.claims.set(id, newClaim);
    return newClaim;
  }

  async getClaimById(id: string): Promise<Claim | null> {
    return this.claims.get(id) || null;
  }

  async getClaimsByItem(itemId: string): Promise<Claim[]> {
    return Array.from(this.claims.values()).filter((c) => c.itemId === itemId);
  }

  async getClaimsByClaimant(claimantId: string): Promise<Claim[]> {
    return Array.from(this.claims.values()).filter((c) => c.claimantId === claimantId);
  }

  async updateClaim(id: string, updates: Partial<Claim>): Promise<Claim | null> {
    const claim = this.claims.get(id);
    if (!claim) return null;

    const updated: Claim = {
      ...claim,
      ...updates,
      id: claim.id,
      itemId: claim.itemId,
      claimantId: claim.claimantId,
      createdAt: claim.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.claims.set(id, updated);
    return updated;
  }

  // --- Notifications ---
  async createNotification(
    notification: Omit<AppNotification, 'id' | 'createdAt'> & { id?: string }
  ): Promise<AppNotification> {
    const id = notification.id || uuidv4();
    const newNotification: AppNotification = {
      ...notification,
      id,
      read: notification.read ?? false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  async getNotificationsByUser(userId: string): Promise<AppNotification[]> {
    return Array.from(this.notifications.values())
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async markNotificationRead(id: string, userId: string): Promise<boolean> {
    const notif = this.notifications.get(id);
    if (!notif || notif.userId !== userId) return false;
    notif.read = true;
    return true;
  }

  // --- Audit Logs ---
  async createAuditLog(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry> {
    const newEntry: AuditLogEntry = {
      ...entry,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.unshift(newEntry);
    return newEntry;
  }

  async getAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
    return this.auditLogs.slice(0, limit);
  }

  // Clear all data (useful for test isolation)
  clearAll() {
    this.users.clear();
    this.items.clear();
    this.matches.clear();
    this.claims.clear();
    this.notifications.clear();
    this.auditLogs = [];
  }
}

export const db = new DatabaseService();

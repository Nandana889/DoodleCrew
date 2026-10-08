import { Request } from 'express';

export type UserRole = 'student' | 'staff' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export type ItemType = 'lost' | 'found';

export type ItemCategory =
  | 'electronics'
  | 'id_cards'
  | 'keys'
  | 'wallets'
  | 'clothing'
  | 'books'
  | 'accessories'
  | 'other';

export type ItemStatus =
  | 'reported'
  | 'potential_match'
  | 'verification_pending'
  | 'confirmed_match'
  | 'returned'
  | 'closed';

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  description: string;
  category: ItemCategory;
  color: string[];
  features: string[];
  location: string;
  eventDate: string; // ISO date string when lost or found
  imageUrl?: string;
  storageLocation?: string; // e.g. "Security Desk - Main Block"
  contactInfo?: string; // Private; masked for unauthorized users
  status: ItemStatus;
  userId: string;
  reporterName?: string;
  createdAt: string;
  updatedAt: string;
}

export type PublicItem = Omit<Item, 'contactInfo'> & {
  contactInfo?: string; // only present if caller is owner or admin
  isOwner?: boolean;
};

export interface AIMatchCandidateRequest {
  lostItem: {
    id: string;
    title: string;
    description: string;
    category: string;
    color: string[];
    features: string[];
    location: string;
    eventDate: string;
    imageUrl?: string;
  };
  foundItem: {
    id: string;
    title: string;
    description: string;
    category: string;
    color: string[];
    features: string[];
    location: string;
    eventDate: string;
    imageUrl?: string;
  };
}

export interface AIMatchResult {
  lostItemId: string;
  foundItemId: string;
  similarityScore: number; // 0 to 100
  confidence: 'high' | 'medium' | 'low';
  matchedAttributes: string[];
  reasons: string[];
  modelMetadata: {
    model: string;
    timestamp: string;
    version: string;
  };
}

export type MatchStatus = 'pending' | 'verified' | 'dismissed';

export interface MatchRecord {
  id: string;
  lostItemId: string;
  foundItemId: string;
  similarityScore: number;
  confidence: 'high' | 'medium' | 'low';
  matchedAttributes: string[];
  reasons: string[];
  status: MatchStatus;
  createdAt: string;
  lostItem?: Item;
  foundItem?: Item;
}

export type ClaimStatus = 'submitted' | 'under_review' | 'approved' | 'rejected';

export interface ClaimVerificationDetails {
  proofDescription: string;
  uniqueIdentifiers?: string; // e.g. serial number, wallpaper description, engravement
  secretDetails?: string; // confidential detail only true owner knows
  imageProofUrl?: string;
}

export interface Claim {
  id: string;
  itemId: string; // The found item being claimed
  matchId?: string; // Optional reference to AI match
  claimantId: string;
  status: ClaimStatus;
  verificationDetails: ClaimVerificationDetails;
  reviewerId?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | 'match_found'
  | 'claim_submitted'
  | 'claim_reviewed'
  | 'item_returned'
  | 'system';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: Record<string, unknown>;
}

import { z } from 'zod';

/**
 * Standard item categories recognized across CampusFind.
 */
export const ItemCategoryEnum = z.enum([
  'electronics',
  'backpack_or_bag',
  'keys_and_cards',
  'clothing_and_wearables',
  'books_and_stationery',
  'bottles_and_lunchboxes',
  'eyewear_and_accessories',
  'sports_equipment',
  'other'
]);
export type ItemCategory = z.infer<typeof ItemCategoryEnum>;

/**
 * Normalized location schema.
 */
export interface LocationInfo {
  building?: string;
  room?: string;
  campusArea?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  rawText?: string;
}

export const LocationInfoSchema: z.ZodType<LocationInfo, any, any> = z.object({
  building: z.string().max(100).optional(),
  room: z.string().max(100).optional(),
  campusArea: z.string().max(100).optional(),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional(),
  rawText: z.string().max(250).optional()
});

/**
 * Input report schema from backend (Member 3) or frontend (Member 2).
 */
export interface ItemReport {
  id: string;
  type: 'lost' | 'found';
  title: string;
  description: string;
  category: string;
  location?: LocationInfo | string;
  dateTime?: string;
  imageUrl?: string;
  tags: string[];
  status: 'reported' | 'potential_match' | 'verification' | 'confirmed' | 'returned' | 'closed';
}

export const ItemReportSchema: z.ZodType<ItemReport, any, any> = z.object({
  id: z.string().min(1),
  type: z.enum(['lost', 'found']),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  category: z.string().max(50).default('other'),
  location: z.union([LocationInfoSchema, z.string().max(250)]).optional(),
  dateTime: z.string().datetime().optional().or(z.string().max(50).optional()),
  imageUrl: z.string().url().max(1000).optional().or(z.literal('')),
  tags: z.array(z.string().max(50)).default([]),
  status: z.enum([
    'reported',
    'potential_match',
    'verification',
    'confirmed',
    'returned',
    'closed'
  ]).default('reported')
});

/**
 * Extracted structured attributes produced by Gemma / NLP understanding.
 * Validated strictly against prompt injection or malformed model output.
 */
export interface StructuredAttributes {
  normalizedCategory: ItemCategory;
  brand: string | null;
  primaryColors: string[];
  distinguishingFeatures: string[];
  modelOrIdentifiers: string | null;
  condition: 'new' | 'good' | 'worn' | 'damaged' | 'unknown';
  visualTags: string[];
  extractedKeywords: string[];
}

export const StructuredAttributesSchema: z.ZodType<StructuredAttributes, any, any> = z.object({
  normalizedCategory: ItemCategoryEnum,
  brand: z.string().max(50).nullable().default(null),
  primaryColors: z.array(z.string().toLowerCase().max(30)).default([]),
  distinguishingFeatures: z.array(z.string().max(100)).default([]),
  modelOrIdentifiers: z.string().max(100).nullable().default(null),
  condition: z.enum(['new', 'good', 'worn', 'damaged', 'unknown']).default('unknown'),
  visualTags: z.array(z.string().max(50)).default([]),
  extractedKeywords: z.array(z.string().max(50)).default([])
});

/**
 * Detailed factor scores breakdown with architecturally justified weights.
 */
export interface CompatibilityBreakdown {
  categoryScore: number;
  semanticScore: number;
  visualScore: number;
  featuresScore: number;
  locationScore: number;
  timeScore: number;
}

export const CompatibilityBreakdownSchema: z.ZodType<CompatibilityBreakdown, any, any> = z.object({
  categoryScore: z.number().min(0).max(1),
  semanticScore: z.number().min(0).max(1),
  visualScore: z.number().min(0).max(1),
  featuresScore: z.number().min(0).max(1),
  locationScore: z.number().min(0).max(1),
  timeScore: z.number().min(0).max(1)
});

/**
 * Model execution metadata for observability and auditability.
 */
export interface ModelMetadata {
  modelName: string;
  modelVersion: string;
  processingTimeMs: number;
  gemmaUsed: boolean;
  visionUsed: boolean;
  fallbackUsed: boolean;
}

export const ModelMetadataSchema: z.ZodType<ModelMetadata, any, any> = z.object({
  modelName: z.string(),
  modelVersion: z.string(),
  processingTimeMs: z.number().nonnegative(),
  gemmaUsed: z.boolean(),
  visionUsed: z.boolean(),
  fallbackUsed: z.boolean()
});

/**
 * Complete Match Result returned to Backend / Frontend.
 */
export interface MatchResult {
  lostItemId: string;
  foundItemId: string;
  similarity: number;
  confidence: 'high' | 'medium' | 'low' | 'unlikely';
  breakdown: CompatibilityBreakdown;
  matchedAttributes: {
    categoryMatch: boolean;
    commonColors: string[];
    commonFeatures: string[];
    locationCompatibility: string;
    timeDifferenceHours?: number | null;
  };
  reasons: string[];
  concerns: string[];
  modelMetadata: ModelMetadata;
}

export const MatchResultSchema: z.ZodType<MatchResult, any, any> = z.object({
  lostItemId: z.string(),
  foundItemId: z.string(),
  similarity: z.number().min(0).max(1),
  confidence: z.enum(['high', 'medium', 'low', 'unlikely']),
  breakdown: CompatibilityBreakdownSchema,
  matchedAttributes: z.object({
    categoryMatch: z.boolean(),
    commonColors: z.array(z.string()),
    commonFeatures: z.array(z.string()),
    locationCompatibility: z.string(),
    timeDifferenceHours: z.number().nullable().optional()
  }),
  reasons: z.array(z.string()),
  concerns: z.array(z.string()).default([]),
  modelMetadata: ModelMetadataSchema
});

/**
 * Options for candidate retrieval & matching.
 */
export interface CandidateMatchOptions {
  minConfidenceThreshold?: number;
  maxCandidates?: number;
  maxTimeDifferenceDays?: number;
  enableGemma?: boolean;
  enableVision?: boolean;
}

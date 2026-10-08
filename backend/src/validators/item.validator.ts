import { z } from 'zod';

export const itemCategoryEnum = z.enum([
  'electronics',
  'id_cards',
  'keys',
  'wallets',
  'clothing',
  'books',
  'accessories',
  'other',
]);

export const itemStatusEnum = z.enum([
  'reported',
  'potential_match',
  'verification_pending',
  'confirmed_match',
  'returned',
  'closed',
]);

export const createLostItemSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().min(5, 'Description must be at least 5 characters').max(2000),
  category: itemCategoryEnum,
  color: z.array(z.string().min(1).max(50)).optional().default([]),
  features: z.array(z.string().min(1).max(100)).optional().default([]),
  location: z.string().min(2, 'Location must be specified').max(200),
  eventDate: z.string().datetime({ message: 'eventDate must be a valid ISO 8601 string' }),
  imageUrl: z.string().url('Image URL must be valid').optional().or(z.literal('')),
  contactInfo: z.string().max(200).optional(),
});

export const createFoundItemSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().min(5, 'Description must be at least 5 characters').max(2000),
  category: itemCategoryEnum,
  color: z.array(z.string().min(1).max(50)).optional().default([]),
  features: z.array(z.string().min(1).max(100)).optional().default([]),
  location: z.string().min(2, 'Location where found must be specified').max(200),
  eventDate: z.string().datetime({ message: 'eventDate must be a valid ISO 8601 string' }),
  imageUrl: z.string().url('Image URL must be valid').optional().or(z.literal('')),
  storageLocation: z.string().max(200).optional(),
});

export const updateItemSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(5).max(2000).optional(),
  category: itemCategoryEnum.optional(),
  color: z.array(z.string().min(1).max(50)).optional(),
  features: z.array(z.string().min(1).max(100)).optional(),
  location: z.string().min(2).max(200).optional(),
  eventDate: z.string().datetime().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  storageLocation: z.string().max(200).optional(),
  contactInfo: z.string().max(200).optional(),
  status: itemStatusEnum.optional(),
});

export const itemQuerySchema = z.object({
  type: z.enum(['lost', 'found']).optional(),
  category: itemCategoryEnum.optional(),
  status: itemStatusEnum.optional(),
  search: z.string().max(100).optional(),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format; must be a valid UUID'),
});

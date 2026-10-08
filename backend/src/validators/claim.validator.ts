import { z } from 'zod';

export const submitClaimSchema = z.object({
  itemId: z.string().uuid('Invalid item ID; must be a valid UUID'),
  matchId: z.string().uuid('Invalid match ID').optional(),
  verificationDetails: z.object({
    proofDescription: z
      .string()
      .min(10, 'Please provide detailed proof of ownership (minimum 10 characters)')
      .max(2000),
    uniqueIdentifiers: z.string().max(500).optional(),
    secretDetails: z.string().max(500).optional(),
    imageProofUrl: z.string().url('Proof image URL must be valid').optional().or(z.literal('')),
  }),
});

export const updateClaimStatusSchema = z.object({
  status: z.enum(['under_review', 'approved', 'rejected'], {
    errorMap: () => ({ message: 'Status must be under_review, approved, or rejected' }),
  }),
  reviewNotes: z.string().max(1000).optional(),
});

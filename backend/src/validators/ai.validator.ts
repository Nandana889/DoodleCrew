import { z } from 'zod';

export const aiCandidateRequestSchema = z.object({
  lostItemId: z.string().uuid(),
  foundItemId: z.string().uuid(),
});

// Strictly validate untrusted output from external AI / model service
export const aiResponseSchema = z.object({
  similarityScore: z.number().min(0).max(100),
  confidence: z.enum(['high', 'medium', 'low']),
  matchedAttributes: z.array(z.string().max(200)).max(50).default([]),
  reasons: z.array(z.string().max(500)).max(50).default([]),
  modelMetadata: z
    .object({
      model: z.string().max(100).default('campusfind-ai-gemma'),
      timestamp: z.string().default(new Date().toISOString()),
      version: z.string().max(50).default('1.0'),
    })
    .default({
      model: 'campusfind-ai-gemma',
      timestamp: new Date().toISOString(),
      version: '1.0',
    }),
});

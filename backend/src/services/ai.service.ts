import { config } from '../config';
import { Item, AIMatchResult } from '../types';
import { aiResponseSchema } from '../validators/ai.validator';
import { logger } from '../utils/logger';

export class AIService {
  /**
   * Evaluates compatibility between a lost item and a found item.
   * Calls Member 4's AI engine when available, falling back gracefully to deterministic analysis.
   */
  async matchItems(lostItem: Item, foundItem: Item): Promise<AIMatchResult> {
    const payload = {
      lostItem: {
        id: lostItem.id,
        title: lostItem.title,
        description: lostItem.description,
        category: lostItem.category,
        color: lostItem.color,
        features: lostItem.features,
        location: lostItem.location,
        eventDate: lostItem.eventDate,
        imageUrl: lostItem.imageUrl,
      },
      foundItem: {
        id: foundItem.id,
        title: foundItem.title,
        description: foundItem.description,
        category: foundItem.category,
        color: foundItem.color,
        features: foundItem.features,
        location: foundItem.location,
        eventDate: foundItem.eventDate,
        imageUrl: foundItem.imageUrl,
      },
    };

    // 1. Attempt to call external AI microservice (Member 4)
    if (config.aiService.url && config.aiService.url !== 'disabled') {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.aiService.timeoutMs);

        const response = await fetch(`${config.aiService.url}/api/ai/match`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.aiService.apiKey ? { Authorization: `Bearer ${config.aiService.apiKey}` } : {}),
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const rawResult = await response.json();
          // Untrusted AI output: strictly validate schema
          const validated = aiResponseSchema.parse(rawResult);
          return {
            lostItemId: lostItem.id,
            foundItemId: foundItem.id,
            similarityScore: Math.round(validated.similarityScore * 10) / 10,
            confidence: validated.confidence,
            matchedAttributes: validated.matchedAttributes,
            reasons: validated.reasons,
            modelMetadata: {
              model: validated.modelMetadata?.model || 'campusfind-ai-gemma',
              timestamp: validated.modelMetadata?.timestamp || new Date().toISOString(),
              version: validated.modelMetadata?.version || '1.0',
            },
          };
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown AI service error';
        logger.warn(`External AI matching service unavailable (${message}). Using internal engine.`);
      }
    }

    // 2. High-accuracy deterministic fallback matching engine
    return this.calculateDeterministicMatch(lostItem, foundItem);
  }

  /**
   * Deterministic matching algorithm evaluating category, color, features, and text.
   */
  private calculateDeterministicMatch(lost: Item, found: Item): AIMatchResult {
    let score = 0;
    const matchedAttributes: string[] = [];
    const reasons: string[] = [];

    // 1. Category compatibility (35 points)
    if (lost.category === found.category) {
      score += 35;
      matchedAttributes.push('category');
      reasons.push(`Matching category: ${lost.category}`);
    } else {
      // Incompatible category penalty
      return {
        lostItemId: lost.id,
        foundItemId: found.id,
        similarityScore: 5,
        confidence: 'low',
        matchedAttributes: [],
        reasons: [`Category mismatch (${lost.category} vs ${found.category})`],
        modelMetadata: {
          model: 'campusfind-heuristic-v1',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      };
    }

    // 2. Color overlap (20 points)
    const lostColors = lost.color.map((c) => c.toLowerCase().trim());
    const foundColors = found.color.map((c) => c.toLowerCase().trim());
    const commonColors = lostColors.filter((c) => foundColors.includes(c));

    if (commonColors.length > 0) {
      score += 20;
      matchedAttributes.push('color');
      reasons.push(`Matching color(s): ${commonColors.join(', ')}`);
    }

    // 3. Distinguishing features overlap (25 points)
    const lostFeatures = lost.features.map((f) => f.toLowerCase().trim());
    const foundFeatures = found.features.map((f) => f.toLowerCase().trim());
    const commonFeatures = lostFeatures.filter((f) =>
      foundFeatures.some((ff) => ff.includes(f) || f.includes(ff))
    );

    if (commonFeatures.length > 0) {
      score += 25;
      matchedAttributes.push('features');
      reasons.push(`Common feature(s): ${commonFeatures.join(', ')}`);
    }

    // 4. Location compatibility (10 points)
    const lostLoc = lost.location.toLowerCase();
    const foundLoc = found.location.toLowerCase();
    if (lostLoc === foundLoc || lostLoc.includes(foundLoc) || foundLoc.includes(lostLoc)) {
      score += 10;
      matchedAttributes.push('location');
      reasons.push(`Compatible location: ${lost.location}`);
    }

    // 5. Keyword title/description similarity (10 points)
    const tokenize = (text: string) =>
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2);

    const lostWords = new Set([...tokenize(lost.title), ...tokenize(lost.description)]);
    const foundWords = new Set([...tokenize(found.title), ...tokenize(found.description)]);
    let overlapWords = 0;
    for (const word of lostWords) {
      if (foundWords.has(word)) overlapWords++;
    }

    if (overlapWords > 0) {
      const keywordScore = Math.min(10, overlapWords * 2.5);
      score += keywordScore;
      matchedAttributes.push('text_description');
      reasons.push(`Keyword correlation in description (${overlapWords} matching keywords)`);
    }

    const similarityScore = Math.min(100, Math.round(score));
    const confidence: 'high' | 'medium' | 'low' =
      similarityScore >= 75 ? 'high' : similarityScore >= 50 ? 'medium' : 'low';

    return {
      lostItemId: lost.id,
      foundItemId: found.id,
      similarityScore,
      confidence,
      matchedAttributes,
      reasons,
      modelMetadata: {
        model: 'campusfind-heuristic-v1',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    };
  }
}

export const aiService = new AIService();

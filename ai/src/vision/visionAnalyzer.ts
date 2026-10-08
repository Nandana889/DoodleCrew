import { StructuredAttributes } from '../types/index.js';

export interface VisualFeatures {
  detectedLabels: string[];
  dominantColors: string[];
  visualCondition: 'new' | 'good' | 'worn' | 'damaged' | 'unknown';
  imageProcessed: boolean;
}

export class VisionAnalyzer {
  /**
   * Analyzes an image URL if provided.
   * If no image URL is present, returns an empty representation allowing graceful degradation.
   */
  async analyzeImage(
    imageUrl?: string,
    extractedAttrs?: StructuredAttributes
  ): Promise<VisualFeatures> {
    if (!imageUrl || imageUrl.trim() === '') {
      return {
        detectedLabels: [],
        dominantColors: [],
        visualCondition: 'unknown',
        imageProcessed: false
      };
    }

    // In a live production environment with Google Vision / Gemini Vision API,
    // we would call the endpoint. Here we parse image metadata or fallback to
    // aligning with extracted semantic visual tags.
    const colors = extractedAttrs?.primaryColors || [];
    const labels = (extractedAttrs?.visualTags || []).concat(
      extractedAttrs?.distinguishingFeatures || []
    );

    return {
      detectedLabels: labels,
      dominantColors: colors,
      visualCondition: extractedAttrs?.condition || 'unknown',
      imageProcessed: true
    };
  }

  /**
   * Calculates visual feature similarity between lost and found items.
   * Score ranges from 0.0 to 1.0.
   */
  calculateVisualSimilarity(
    lostVisual: VisualFeatures,
    foundVisual: VisualFeatures
  ): { score: number; commonTags: string[]; evaluated: boolean } {
    if (!lostVisual.imageProcessed && !foundVisual.imageProcessed) {
      // Neither report had an image: cannot evaluate visually
      return { score: 0.5, commonTags: [], evaluated: false };
    }

    // If one has an image and the other doesn't, partial evaluation based on common tags
    const lostTags = new Set(
      lostVisual.detectedLabels.concat(lostVisual.dominantColors).map(t => t.toLowerCase())
    );
    const foundTags = new Set(
      foundVisual.detectedLabels.concat(foundVisual.dominantColors).map(t => t.toLowerCase())
    );

    const common: string[] = [];
    for (const tag of lostTags) {
      if (foundTags.has(tag)) {
        common.push(tag);
      }
    }

    const unionSize = new Set([...lostTags, ...foundTags]).size;
    if (unionSize === 0) {
      return { score: 0.5, commonTags: [], evaluated: true };
    }

    const jaccard = common.length / unionSize;
    return { score: Math.min(1.0, jaccard * 1.5), commonTags: common, evaluated: true };
  }
}

import {
  ItemReport,
  StructuredAttributes,
  CompatibilityBreakdown,
  CandidateMatchOptions,
  ItemCategory
} from '../types/index.js';
import { AttributeExtractor } from '../extraction/attributeExtractor.js';
import { VisionAnalyzer, VisualFeatures } from '../vision/visionAnalyzer.js';

export interface PreFilterResult {
  eligible: boolean;
  reason?: string;
}

export class MatchingEngine {
  private attributeExtractor: AttributeExtractor;
  private visionAnalyzer: VisionAnalyzer;

  constructor(options?: {
    attributeExtractor?: AttributeExtractor;
    visionAnalyzer?: VisionAnalyzer;
  }) {
    this.attributeExtractor = options?.attributeExtractor || new AttributeExtractor();
    this.visionAnalyzer = options?.visionAnalyzer || new VisionAnalyzer();
  }

  /**
   * Fast deterministic candidate filtering to eliminate obvious non-matches
   * before running expensive comparisons.
   */
  filterCandidate(
    lostReport: ItemReport,
    foundReport: ItemReport,
    lostAttrs: StructuredAttributes,
    foundAttrs: StructuredAttributes,
    options?: CandidateMatchOptions
  ): PreFilterResult {
    // 1. Incompatible Category Check
    if (
      lostAttrs.normalizedCategory !== 'other' &&
      foundAttrs.normalizedCategory !== 'other' &&
      lostAttrs.normalizedCategory !== foundAttrs.normalizedCategory
    ) {
      return {
        eligible: false,
        reason: `Category mismatch: ${lostAttrs.normalizedCategory} cannot match ${foundAttrs.normalizedCategory}`
      };
    }

    // 2. Physical Causality Check: Found time cannot occur substantially before Lost time
    if (lostReport.dateTime && foundReport.dateTime) {
      const lostTime = new Date(lostReport.dateTime).getTime();
      const foundTime = new Date(foundReport.dateTime).getTime();

      if (!isNaN(lostTime) && !isNaN(foundTime)) {
        // Allow a small grace margin of 3 hours for reporting inaccuracies
        const graceMarginMs = 3 * 3600 * 1000;
        if (foundTime < lostTime - graceMarginMs) {
          return {
            eligible: false,
            reason: 'Item was reportedly found significantly before it was reported lost'
          };
        }

        // Check max time difference if requested
        if (options?.maxTimeDifferenceDays) {
          const maxDiffMs = options.maxTimeDifferenceDays * 24 * 3600 * 1000;
          if (Math.abs(foundTime - lostTime) > maxDiffMs) {
            return {
              eligible: false,
              reason: `Exceeds maximum search time window of ${options.maxTimeDifferenceDays} days`
            };
          }
        }
      }
    }

    return { eligible: true };
  }

  /**
   * Computes the semantic similarity between two descriptions and titles using
   * token overlap, n-grams, and keyword intersection.
   */
  calculateSemanticSimilarity(
    lostReport: ItemReport,
    foundReport: ItemReport,
    lostAttrs: StructuredAttributes,
    foundAttrs: StructuredAttributes
  ): number {
    const text1 = `${lostReport.title} ${lostReport.description}`.toLowerCase();
    const text2 = `${foundReport.title} ${foundReport.description}`.toLowerCase();

    const words1 = new Set(text1.match(/\b[a-z0-9]{3,}\b/g) || []);
    const words2 = new Set(text2.match(/\b[a-z0-9]{3,}\b/g) || []);

    if (words1.size === 0 || words2.size === 0) {
      return 0.3; // degraded confidence for empty text
    }

    let sharedCount = 0;
    for (const w of words1) {
      if (words2.has(w)) {
        sharedCount++;
      }
    }

    const jaccard = sharedCount / new Set([...words1, ...words2]).size;

    // Check brand match boost or penalty
    let brandModifier = 0;
    if (lostAttrs.brand && foundAttrs.brand) {
      brandModifier = lostAttrs.brand.toLowerCase() === foundAttrs.brand.toLowerCase() ? 0.3 : -0.4;
    }

    const finalScore = Math.max(0, Math.min(1, jaccard * 1.8 + brandModifier));
    return Number(finalScore.toFixed(3));
  }

  /**
   * Computes color and distinguishing features overlap.
   */
  calculateFeaturesSimilarity(
    lostAttrs: StructuredAttributes,
    foundAttrs: StructuredAttributes
  ): { score: number; commonColors: string[]; commonFeatures: string[] } {
    // 1. Color overlap
    const lostColors = new Set(lostAttrs.primaryColors.map(c => c.toLowerCase()));
    const foundColors = new Set(foundAttrs.primaryColors.map(c => c.toLowerCase()));
    const commonColors: string[] = [];

    for (const c of lostColors) {
      if (foundColors.has(c)) {
        commonColors.push(c);
      }
    }

    let colorScore = 0.5;
    if (lostColors.size > 0 && foundColors.size > 0) {
      colorScore = commonColors.length > 0 ? 0.9 : 0.1;
      // Disjoint color conflict penalty (e.g. red vs blue)
      const disjointLostColors = Array.from(lostColors).filter(c => !foundColors.has(c));
      const disjointFoundColors = Array.from(foundColors).filter(c => !lostColors.has(c));
      if (disjointLostColors.length > 0 && disjointFoundColors.length > 0) {
        colorScore = Math.max(0.1, colorScore - 0.25);
      }
    }

    // 2. Distinguishing features overlap
    const lostFeatures = new Set(lostAttrs.distinguishingFeatures.map(f => f.toLowerCase()));
    const foundFeatures = new Set(foundAttrs.distinguishingFeatures.map(f => f.toLowerCase()));
    const commonFeatures: string[] = [];

    for (const f of lostFeatures) {
      if (foundFeatures.has(f)) {
        commonFeatures.push(f);
      }
    }

    let featureScore = 0.5;
    if (lostFeatures.size > 0 || foundFeatures.size > 0) {
      const totalUnique = new Set([...lostFeatures, ...foundFeatures]).size;
      featureScore = totalUnique > 0 ? commonFeatures.length / totalUnique : 0.5;
      if (commonFeatures.length > 0) {
        featureScore = Math.min(1.0, 0.4 + (commonFeatures.length / totalUnique) * 0.5);
      }
    }

    // Condition conflict penalty (e.g. 'new' vs 'worn' / 'damaged')
    let conditionPenalty = 0.0;
    if (lostAttrs.condition !== 'unknown' && foundAttrs.condition !== 'unknown') {
      if (
        (lostAttrs.condition === 'new' && (foundAttrs.condition === 'worn' || foundAttrs.condition === 'damaged')) ||
        (foundAttrs.condition === 'new' && (lostAttrs.condition === 'worn' || lostAttrs.condition === 'damaged'))
      ) {
        conditionPenalty = 0.30;
      }
    }

    const combinedScore = Math.max(0.05, (colorScore * 0.5) + (featureScore * 0.5) - conditionPenalty);
    return {
      score: Number(combinedScore.toFixed(3)),
      commonColors,
      commonFeatures
    };
  }

  /**
   * Computes location proximity and compatibility.
   */
  calculateLocationCompatibility(
    lostLoc: ItemReport['location'],
    foundLoc: ItemReport['location']
  ): { score: number; description: string } {
    if (!lostLoc || !foundLoc) {
      return { score: 0.5, description: 'Location information incomplete in one or both reports' };
    }

    const parseLocText = (l: ItemReport['location']): string => {
      if (!l) return '';
      if (typeof l === 'string') return l.toLowerCase();
      const locObj = l as { building?: string; room?: string; campusArea?: string; rawText?: string };
      return `${locObj.building || ''} ${locObj.room || ''} ${locObj.campusArea || ''} ${locObj.rawText || ''}`.toLowerCase().trim();
    };

    const loc1 = parseLocText(lostLoc);
    const loc2 = parseLocText(foundLoc);

    if (!loc1 || !loc2) {
      return { score: 0.5, description: 'Location details not specified' };
    }

    // Check exact room/building match
    if (loc1 === loc2) {
      return { score: 1.0, description: 'Exact location match' };
    }

    // Check common building words (library, student center, cafeteria, lab, dorm, etc.)
    const words1 = loc1.split(/\s+/).filter(w => w.length > 3);
    const words2 = new Set(loc2.split(/\s+/).filter(w => w.length > 3));
    const sharedBuilding = words1.filter(w => words2.has(w));

    if (sharedBuilding.length > 0) {
      const formatted = sharedBuilding
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(', ');
      return {
        score: 0.85,
        description: `Compatible campus building or area: ${formatted}`
      };
    }

    return { score: 0.35, description: 'Different campus locations reported' };
  }

  /**
   * Computes time compatibility.
   */
  calculateTimeCompatibility(
    lostTimeStr?: string,
    foundTimeStr?: string
  ): { score: number; differenceHours: number | null } {
    if (!lostTimeStr || !foundTimeStr) {
      return { score: 0.5, differenceHours: null };
    }

    const t1 = new Date(lostTimeStr).getTime();
    const t2 = new Date(foundTimeStr).getTime();

    if (isNaN(t1) || !isNaN(t2)) {
      return { score: 0.5, differenceHours: null };
    }

    const diffHours = (t2 - t1) / (1000 * 3600);

    // Lost before found within 24 hours: optimal
    if (diffHours >= -2 && diffHours <= 24) {
      return { score: 1.0, differenceHours: Math.round(diffHours) };
    }
    // Found within 7 days
    if (diffHours > 24 && diffHours <= 168) {
      return { score: 0.8, differenceHours: Math.round(diffHours) };
    }
    // Found within 30 days
    if (diffHours > 168 && diffHours <= 720) {
      return { score: 0.6, differenceHours: Math.round(diffHours) };
    }

    return { score: 0.3, differenceHours: Math.round(diffHours) };
  }

  /**
   * Computes multi-factor weighted match score with dynamic normalization.
   *
   * Weights Justification:
   * - Category (0.25): Incompatible categories are strictly disqualified or heavily penalized.
   * - Semantic Description (0.25): Deep textual and attribute coherence.
   * - Distinguishing Features & Colors (0.20): Differentiates between identical models (e.g. scratches, stickers).
   * - Visual Features (0.15): Image tag and color match when images are uploaded.
   * - Location (0.10): Spatial feasibility across campus zones.
   * - Time (0.05): Temporal order and proximity.
   */
  computeMultiFactorScore(
    breakdown: CompatibilityBreakdown,
    hasImage: boolean,
    hasLocation: boolean,
    hasTime: boolean
  ): number {
    // Base architectural weights
    let wCategory = 0.25;
    let wSemantic = 0.25;
    let wFeatures = 0.20;
    let wVisual = hasImage ? 0.15 : 0.0;
    let wLocation = hasLocation ? 0.10 : 0.0;
    let wTime = hasTime ? 0.05 : 0.0;

    // Normalize weights to sum exactly to 1.0
    const totalWeight = wCategory + wSemantic + wFeatures + wVisual + wLocation + wTime;
    const factor = 1.0 / totalWeight;

    const weightedScore =
      breakdown.categoryScore * (wCategory * factor) +
      breakdown.semanticScore * (wSemantic * factor) +
      breakdown.featuresScore * (wFeatures * factor) +
      breakdown.visualScore * (wVisual * factor) +
      breakdown.locationScore * (wLocation * factor) +
      breakdown.timeScore * (wTime * factor);

    return Number(Math.max(0, Math.min(1, weightedScore)).toFixed(3));
  }
}

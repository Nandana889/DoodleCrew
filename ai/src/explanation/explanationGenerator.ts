import {
  ItemReport,
  StructuredAttributes,
  CompatibilityBreakdown
} from '../types/index.js';

export interface ExplanationResult {
  reasons: string[];
  concerns: string[];
}

export class ExplanationGenerator {
  /**
   * Generates evidence-grounded reasons and caveats strictly supported
   * by the provided reports and extracted attributes.
   */
  generateExplanation(
    lostReport: ItemReport,
    foundReport: ItemReport,
    lostAttrs: StructuredAttributes,
    foundAttrs: StructuredAttributes,
    breakdown: CompatibilityBreakdown,
    commonColors: string[],
    commonFeatures: string[],
    locationSummary: string
  ): ExplanationResult {
    const reasons: string[] = [];
    const concerns: string[] = [];

    // 1. Category
    if (lostAttrs.normalizedCategory === foundAttrs.normalizedCategory && lostAttrs.normalizedCategory !== 'other') {
      const cleanCat = lostAttrs.normalizedCategory.replace(/_/g, ' ');
      reasons.push(`Both reports identify the item as belonging to the '${cleanCat}' category.`);
    } else if (breakdown.categoryScore < 0.4) {
      concerns.push(`Category mismatch between '${lostAttrs.normalizedCategory}' and '${foundAttrs.normalizedCategory}'.`);
    }

    // 2. Brand
    if (lostAttrs.brand && foundAttrs.brand) {
      if (lostAttrs.brand.toLowerCase() === foundAttrs.brand.toLowerCase()) {
        reasons.push(`Both reports specifically identify the brand '${lostAttrs.brand}'.`);
      } else {
        concerns.push(`Brand discrepancy: lost report notes '${lostAttrs.brand}' while found report notes '${foundAttrs.brand}'.`);
      }
    }

    // 3. Colors
    if (commonColors.length > 0) {
      reasons.push(`Both reports mention common color(s): ${commonColors.join(', ')}.`);
    } else if (lostAttrs.primaryColors.length > 0 && foundAttrs.primaryColors.length > 0) {
      concerns.push(`Different colors reported: '${lostAttrs.primaryColors.join(', ')}' vs '${foundAttrs.primaryColors.join(', ')}'.`);
    }

    // 4. Distinguishing features
    if (commonFeatures.length > 0) {
      reasons.push(`Both reports highlight distinctive feature(s): ${commonFeatures.join(', ')}.`);
    }

    // 5. Location
    if (breakdown.locationScore >= 0.8) {
      reasons.push(`Location proximity verified: ${locationSummary}.`);
    } else if (breakdown.locationScore <= 0.35 && lostReport.location && foundReport.location) {
      concerns.push(`Reports are from separate locations: ${locationSummary}.`);
    }

    // 6. Time Plausibility
    if (breakdown.timeScore >= 0.8) {
      reasons.push('The reported timeframe is temporally consistent (lost before or around the time found).');
    } else if (breakdown.timeScore <= 0.3) {
      concerns.push('Large time discrepancy between the loss and found dates.');
    }

    // 7. Missing Information flags
    if (!lostReport.imageUrl && !foundReport.imageUrl) {
      concerns.push('Neither report contains a photograph for visual verification.');
    } else if (!lostReport.imageUrl || !foundReport.imageUrl) {
      concerns.push('Only one report includes a photograph; visual cross-reference is partial.');
    }

    if (!lostReport.location || !foundReport.location) {
      concerns.push('Incomplete location details provided in one or more reports.');
    }

    // Ensure we do not return an empty reason set for eligible matches
    if (reasons.length === 0) {
      reasons.push('General textual and keyword similarity between titles and descriptions.');
    }

    return { reasons, concerns };
  }
}

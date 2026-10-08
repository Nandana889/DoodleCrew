import {
  ItemReport,
  ItemReportSchema,
  MatchResult,
  MatchResultSchema,
  CandidateMatchOptions,
  ModelMetadata
} from './types/index.js';
import { AttributeExtractor } from './extraction/attributeExtractor.js';
import { VisionAnalyzer } from './vision/visionAnalyzer.js';
import { MatchingEngine } from './matching/matchingEngine.js';
import { ExplanationGenerator } from './explanation/explanationGenerator.js';
import { validateAndSanitizeModelOutput } from './security/sanitizer.js';

export interface CampusFindAIOptions {
  gemmaApiKey?: string;
  gemmaApiUrl?: string;
}

export class CampusFindAIService {
  private attributeExtractor: AttributeExtractor;
  private visionAnalyzer: VisionAnalyzer;
  private matchingEngine: MatchingEngine;
  private explanationGenerator: ExplanationGenerator;

  constructor(options?: CampusFindAIOptions) {
    this.attributeExtractor = new AttributeExtractor(options);
    this.visionAnalyzer = new VisionAnalyzer();
    this.matchingEngine = new MatchingEngine({
      attributeExtractor: this.attributeExtractor,
      visionAnalyzer: this.visionAnalyzer
    });
    this.explanationGenerator = new ExplanationGenerator();
  }

  /**
   * Evaluates a single pair: a lost item report against a candidate found item report.
   * Produces a fully validated MatchResult.
   */
  async matchItemPair(
    rawLostReport: ItemReport,
    rawFoundReport: ItemReport,
    options?: CandidateMatchOptions
  ): Promise<MatchResult> {
    const startTime = Date.now();

    // 1. Validate inputs strictly against schema
    const lostValidate = ItemReportSchema.safeParse(rawLostReport);
    if (!lostValidate.success) {
      throw new Error(`Invalid lost item report: ${lostValidate.error.message}`);
    }
    const foundValidate = ItemReportSchema.safeParse(rawFoundReport);
    if (!foundValidate.success) {
      throw new Error(`Invalid found item report: ${foundValidate.error.message}`);
    }

    const lostReport = lostValidate.data;
    const foundReport = foundValidate.data;

    // 2. Structured attribute extraction (Gemma / NLP Fallback)
    const [lostExtracted, foundExtracted] = await Promise.all([
      this.attributeExtractor.extractAttributes(lostReport),
      this.attributeExtractor.extractAttributes(foundReport)
    ]);

    // 3. Fast pre-filter: discard incompatible candidates immediately
    const filterResult = this.matchingEngine.filterCandidate(
      lostReport,
      foundReport,
      lostExtracted.attributes,
      foundExtracted.attributes,
      options
    );

    if (!filterResult.eligible) {
      const breakdown = {
        categoryScore: 0,
        semanticScore: 0,
        visualScore: 0,
        featuresScore: 0,
        locationScore: 0,
        timeScore: 0
      };

      const result: MatchResult = {
        lostItemId: lostReport.id,
        foundItemId: foundReport.id,
        similarity: 0.0,
        confidence: 'unlikely',
        breakdown,
        matchedAttributes: {
          categoryMatch: false,
          commonColors: [],
          commonFeatures: [],
          locationCompatibility: filterResult.reason || 'Candidate disqualified during pre-filtering'
        },
        reasons: [],
        concerns: [filterResult.reason || 'Candidate disqualified during pre-filtering'],
        modelMetadata: {
          modelName: lostExtracted.source === 'gemma' ? 'gemma-2-9b-it' : 'deterministic-nlp-engine',
          modelVersion: '1.0.0',
          processingTimeMs: Date.now() - startTime,
          gemmaUsed: lostExtracted.source === 'gemma',
          visionUsed: false,
          fallbackUsed: lostExtracted.source !== 'gemma'
        }
      };

      return MatchResultSchema.parse(result);
    }

    // 4. Visual analysis
    const [lostVisual, foundVisual] = await Promise.all([
      this.visionAnalyzer.analyzeImage(lostReport.imageUrl, lostExtracted.attributes),
      this.visionAnalyzer.analyzeImage(foundReport.imageUrl, foundExtracted.attributes)
    ]);
    const visualComp = this.visionAnalyzer.calculateVisualSimilarity(lostVisual, foundVisual);

    // 5. Multi-factor components
    const categoryMatch =
      lostExtracted.attributes.normalizedCategory === foundExtracted.attributes.normalizedCategory &&
      lostExtracted.attributes.normalizedCategory !== 'other';
    const categoryScore = categoryMatch ? 1.0 : 0.5;

    const semanticScore = this.matchingEngine.calculateSemanticSimilarity(
      lostReport,
      foundReport,
      lostExtracted.attributes,
      foundExtracted.attributes
    );

    const featuresComp = this.matchingEngine.calculateFeaturesSimilarity(
      lostExtracted.attributes,
      foundExtracted.attributes
    );

    const locationComp = this.matchingEngine.calculateLocationCompatibility(
      lostReport.location,
      foundReport.location
    );

    const timeComp = this.matchingEngine.calculateTimeCompatibility(
      lostReport.dateTime,
      foundReport.dateTime
    );

    const breakdown = {
      categoryScore,
      semanticScore,
      visualScore: visualComp.score,
      featuresScore: featuresComp.score,
      locationScore: locationComp.score,
      timeScore: timeComp.score
    };

    // 6. Multi-factor weighted score
    const hasImage = Boolean(lostReport.imageUrl && foundReport.imageUrl);
    const hasLocation = Boolean(lostReport.location && foundReport.location);
    const hasTime = Boolean(lostReport.dateTime && foundReport.dateTime);

    const similarity = this.matchingEngine.computeMultiFactorScore(
      breakdown,
      hasImage,
      hasLocation,
      hasTime
    );

    // Calibrate confidence level
    let confidence: MatchResult['confidence'] = 'unlikely';
    if (similarity >= 0.78) {
      confidence = 'high';
    } else if (similarity >= 0.58) {
      confidence = 'medium';
    } else if (similarity >= 0.38) {
      confidence = 'low';
    }

    // 7. Evidence-grounded explanation generation
    const explanation = this.explanationGenerator.generateExplanation(
      lostReport,
      foundReport,
      lostExtracted.attributes,
      foundExtracted.attributes,
      breakdown,
      featuresComp.commonColors,
      featuresComp.commonFeatures,
      locationComp.description
    );

    const rawResult: MatchResult = {
      lostItemId: lostReport.id,
      foundItemId: foundReport.id,
      similarity,
      confidence,
      breakdown,
      matchedAttributes: {
        categoryMatch,
        commonColors: featuresComp.commonColors,
        commonFeatures: featuresComp.commonFeatures,
        locationCompatibility: locationComp.description,
        timeDifferenceHours: timeComp.differenceHours
      },
      reasons: explanation.reasons,
      concerns: explanation.concerns,
      modelMetadata: {
        modelName: lostExtracted.source === 'gemma' ? 'gemma-2-9b-it' : 'deterministic-nlp-engine',
        modelVersion: '1.0.0',
        processingTimeMs: Date.now() - startTime,
        gemmaUsed: lostExtracted.source === 'gemma',
        visionUsed: visualComp.evaluated,
        fallbackUsed: lostExtracted.source !== 'gemma'
      }
    };

    // Validate structured output before returning
    const validated = validateAndSanitizeModelOutput(rawResult, MatchResultSchema);
    if (!validated.success) {
      throw new Error(`Output validation failed: ${validated.error}`);
    }

    return validated.data;
  }

  /**
   * Matches a lost item against a list of candidates, filters them,
   * and returns ranked matches in descending order of similarity.
   */
  async rankCandidateMatches(
    lostReport: ItemReport,
    candidateFoundReports: ItemReport[],
    options?: CandidateMatchOptions
  ): Promise<MatchResult[]> {
    const minThreshold = options?.minConfidenceThreshold ?? 0.30;
    const maxResults = options?.maxCandidates ?? 10;

    const matchPromises = candidateFoundReports.map(candidate =>
      this.matchItemPair(lostReport, candidate, options).catch(err => {
        // Log/handle pair failure gracefully without terminating entire batch
        return null;
      })
    );

    const results = (await Promise.all(matchPromises)).filter(
      (m): m is MatchResult => m !== null && m.similarity >= minThreshold
    );

    // Sort descending by similarity score
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, maxResults);
  }
}

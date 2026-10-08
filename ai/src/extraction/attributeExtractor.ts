import {
  ItemReport,
  StructuredAttributes,
  StructuredAttributesSchema,
  ItemCategory,
  ItemCategoryEnum
} from '../types/index.js';
import { sanitizeTextInput, validateAndSanitizeModelOutput } from '../security/sanitizer.js';

// Recognized color keywords for campus items
const KNOWN_COLORS = [
  'black', 'white', 'blue', 'navy', 'red', 'green', 'yellow', 'silver',
  'grey', 'gray', 'pink', 'purple', 'brown', 'gold', 'orange', 'beige'
];

// Recognized brands common on college campuses
const KNOWN_BRANDS = [
  'apple', 'dell', 'lenovo', 'hp', 'asus', 'acer', 'samsung', 'sony',
  'bose', 'anker', 'jbl', 'nike', 'adidas', 'puma', 'north face',
  'patagonia', 'janswport', 'herschel', 'hydro flask', 'stanley',
  'casio', 'ti-84', 'texas instruments'
];

// Category keyword mappings for deterministic categorization
const CATEGORY_KEYWORDS: Record<ItemCategory, string[]> = {
  electronics: [
    'laptop', 'macbook', 'charger', 'phone', 'iphone', 'ipad', 'tablet',
    'earbuds', 'airpods', 'headphones', 'calculator', 'usb', 'cable', 'mouse'
  ],
  backpack_or_bag: [
    'backpack', 'bag', 'tote', 'duffle', 'purse', 'wallet', 'pouch', 'briefcase'
  ],
  keys_and_cards: [
    'keys', 'keychain', 'car key', 'id card', 'badge', 'fob', 'access card', 'lanyard'
  ],
  clothing_and_wearables: [
    'jacket', 'hoodie', 'sweater', 'coat', 'hat', 'cap', 'scarf', 'gloves', 'watch'
  ],
  books_and_stationery: [
    'book', 'textbook', 'notebook', 'binder', 'pen', 'pencil', 'folder', 'pencil case'
  ],
  bottles_and_lunchboxes: [
    'water bottle', 'bottle', 'flask', 'mug', 'tumbler', 'lunchbox', 'thermos', 'hydro'
  ],
  eyewear_and_accessories: [
    'glasses', 'sunglasses', 'spectacles', 'ring', 'necklace', 'bracelet', 'earrings'
  ],
  sports_equipment: [
    'ball', 'racket', 'mat', 'skateboard', 'helmet', 'gloves', 'gym bag'
  ],
  other: []
};

export class AttributeExtractor {
  private gemmaApiKey?: string;
  private gemmaApiUrl?: string;

  constructor(options?: { gemmaApiKey?: string; gemmaApiUrl?: string }) {
    this.gemmaApiKey = options?.gemmaApiKey || process.env.GEMMA_API_KEY || process.env.GOOGLE_AI_API_KEY;
    this.gemmaApiUrl = options?.gemmaApiUrl || process.env.GEMMA_API_URL;
  }

  /**
   * Extracts structured semantic attributes from an item report.
   * Uses Gemma if configured, otherwise falls back to deterministic NLP extraction.
   */
  async extractAttributes(report: ItemReport): Promise<{
    attributes: StructuredAttributes;
    source: 'gemma' | 'deterministic_nlp';
    processingTimeMs: number;
  }> {
    const startTime = Date.now();
    const sanitizedDesc = sanitizeTextInput(report.description);
    const sanitizedTitle = sanitizeTextInput(report.title);
    const combinedText = `${sanitizedTitle} ${sanitizedDesc}`.toLowerCase();

    // If Gemma API is available, attempt real inference
    if (this.gemmaApiKey && this.gemmaApiUrl) {
      try {
        const gemmaResult = await this.callGemmaAPI(report);
        if (gemmaResult) {
          const validated = validateAndSanitizeModelOutput(gemmaResult, StructuredAttributesSchema);
          if (validated.success) {
            return {
              attributes: validated.data,
              source: 'gemma',
              processingTimeMs: Date.now() - startTime
            };
          }
        }
      } catch {
        // Fall back gracefully to deterministic pipeline if network/API fails
      }
    }

    // Deterministic semantic attribute extraction
    const attributes = this.extractDeterministic(report, combinedText);
    return {
      attributes,
      source: 'deterministic_nlp',
      processingTimeMs: Date.now() - startTime
    };
  }

  /**
   * Deterministic semantic attribute extraction ensuring fast, predictable extraction
   * even without an external API connection.
   */
  private extractDeterministic(report: ItemReport, text: string): StructuredAttributes {
    // 1. Detect Category
    let normalizedCategory: ItemCategory = 'other';
    const reportCat = report.category.toLowerCase();
    
    // Check if input category is already one of the standard enum values
    const directCatParse = ItemCategoryEnum.safeParse(reportCat);
    if (directCatParse.success) {
      normalizedCategory = directCatParse.data;
    } else {
      // Deduce category from text
      for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [ItemCategory, string[]][]) {
        if (keywords.some(kw => text.includes(kw) || reportCat.includes(kw))) {
          normalizedCategory = cat;
          break;
        }
      }
    }

    // 2. Detect Colors
    const detectedColors: string[] = [];
    for (const color of KNOWN_COLORS) {
      const colorRegex = new RegExp(`\\b${color}\\b`, 'i');
      if (colorRegex.test(text)) {
        detectedColors.push(color);
      }
    }

    // 3. Detect Brand
    let detectedBrand: string | null = null;
    for (const brand of KNOWN_BRANDS) {
      if (text.includes(brand)) {
        detectedBrand = brand.charAt(0).toUpperCase() + brand.slice(1);
        break;
      }
    }

    // 4. Distinguishing Features
    const distinguishingFeatures: string[] = [];
    const featurePatterns = [
      { pattern: /sticker[s]?\s*(?:of|on)?\s*([a-z0-9\s-]+)/i, label: 'stickers' },
      { pattern: /scratch(?:ed|es)?\s*(?:on)?\s*([a-z0-9\s-]+)?/i, label: 'scratched surface' },
      { pattern: /keychain\s*(?:with|of)?\s*([a-z0-9\s-]+)/i, label: 'keychain' },
      { pattern: /case\s*(?:with|is)?\s*([a-z0-9\s-]+)/i, label: 'protective case' },
      { pattern: /strap\s*(?:is)?\s*([a-z0-9\s-]+)/i, label: 'strap' },
      { pattern: /zipper/i, label: 'zipper detail' },
      { pattern: /tag/i, label: 'identifying tag' },
      { pattern: /dented|dent/i, label: 'dent mark' }
    ];

    for (const { pattern, label } of featurePatterns) {
      if (pattern.test(text)) {
        distinguishingFeatures.push(label);
      }
    }

    // Check custom user tags
    if (Array.isArray(report.tags)) {
      for (const tag of report.tags) {
        const cleanTag = sanitizeTextInput(tag).toLowerCase();
        if (cleanTag && !distinguishingFeatures.includes(cleanTag)) {
          distinguishingFeatures.push(cleanTag);
        }
      }
    }

    // 5. Condition
    let condition: StructuredAttributes['condition'] = 'unknown';
    if (/brand new|mint|unopened/i.test(text)) {
      condition = 'new';
    } else if (/good condition|clean|intact/i.test(text)) {
      condition = 'good';
    } else if (/worn|faded|scuffed|old/i.test(text)) {
      condition = 'worn';
    } else if (/broken|cracked|damaged|torn/i.test(text)) {
      condition = 'damaged';
    }

    // 6. Keywords
    const words = text
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3 && !KNOWN_COLORS.includes(w) && w !== 'with' && w !== 'this' && w !== 'have');
    const uniqueKeywords = Array.from(new Set(words)).slice(0, 10);

    return {
      normalizedCategory,
      brand: detectedBrand,
      primaryColors: Array.from(new Set(detectedColors)),
      distinguishingFeatures: Array.from(new Set(distinguishingFeatures)),
      modelOrIdentifiers: null,
      condition,
      visualTags: detectedColors.concat(detectedBrand ? [detectedBrand.toLowerCase()] : []),
      extractedKeywords: uniqueKeywords
    };
  }

  /**
   * Invokes Gemma API (e.g. Gemma 2 via Google AI or endpoint)
   * with a system prompt instructing strict JSON output.
   */
  private async callGemmaAPI(report: ItemReport): Promise<unknown> {
    const prompt = `You are the CampusFind Gemma AI extraction module.
Analyze this lost/found report and output strictly JSON adhering to the schema:
{
  "normalizedCategory": "electronics" | "backpack_or_bag" | "keys_and_cards" | "clothing_and_wearables" | "books_and_stationery" | "bottles_and_lunchboxes" | "eyewear_and_accessories" | "sports_equipment" | "other",
  "brand": string | null,
  "primaryColors": string[],
  "distinguishingFeatures": string[],
  "modelOrIdentifiers": string | null,
  "condition": "new" | "good" | "worn" | "damaged" | "unknown",
  "visualTags": string[],
  "extractedKeywords": string[]
}

Title: ${report.title}
Category: ${report.category}
Description: ${report.description}

Output ONLY valid raw JSON.`;

    const response = await fetch(this.gemmaApiUrl!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.gemmaApiKey}`
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemma API returned status ${response.status}`);
    }

    const data = await response.json() as any;
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return textOutput ? JSON.parse(textOutput) : null;
  }
}

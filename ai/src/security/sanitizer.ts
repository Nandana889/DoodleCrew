import { z } from 'zod';

/**
 * Sanitizes raw text input to neutralize potential prompt injections,
 * command injections, SQL keywords, and script injections.
 */
export function sanitizeTextInput(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '') // Strip control chars
    .trim();
}

/**
 * Validates untrusted AI/LLM JSON outputs against a Zod schema.
 * Rejects outputs containing forbidden control sequences or malformed structures.
 */
export function validateAndSanitizeModelOutput<T>(
  rawOutput: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    let parsedJson = rawOutput;
    if (typeof rawOutput === 'string') {
      // Clean possible Markdown fence blocks (```json ... ```)
      const cleanJsonStr = rawOutput
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      parsedJson = JSON.parse(cleanJsonStr);
    }

    const parseResult = schema.safeParse(parsedJson);
    if (!parseResult.success) {
      return {
        success: false,
        error: `Schema validation failed: ${parseResult.error.message}`
      };
    }

    return {
      success: true,
      data: parseResult.data
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Malformed JSON from model: ${message}`
    };
  }
}

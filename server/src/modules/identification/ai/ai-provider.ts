/**
 * AI integration point (deliberately NOT implemented yet).
 *
 * Covers two features of the Identification module:
 *  - AI-based fish identification (photo → ranked species suggestions)
 *  - Image-based species search (photo → visually similar records)
 *
 * To add a provider later, implement this interface (e.g. a hosted vision
 * model or a self-trained classifier) and return it from `getAiProvider()`.
 * Suggestions should be stored as IdentificationProposals with proposedBy
 * "AI:<model>" so they go through the same expert verification as people's.
 */

export interface AiSuggestion {
  scientificName: string;
  gbifKey?: number;
  /** 0–1 */
  score: number;
}

export interface AiPhoto {
  buffer: Buffer;
  mimeType: string;
}

export interface AiIdentificationProvider {
  readonly name: string;
  identify(photo: AiPhoto, context?: { country?: string; region?: string }): Promise<AiSuggestion[]>;
  similarImages(photo: AiPhoto, limit?: number): Promise<{ photoId: number; score: number }[]>;
}

/** Returns null until an AI provider is configured. */
export function getAiProvider(): AiIdentificationProvider | null {
  return null;
}

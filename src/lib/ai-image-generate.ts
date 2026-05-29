import "server-only";

import {
  formatOpenAiImageError,
  generateProductImageWithOpenAI,
  type GenerateImageResult,
} from "@/lib/ai-image-openai";
import {
  formatMagnificImageError,
  generateProductImageWithMagnific,
} from "@/lib/ai-image-magnific";
import { getMagnificApiKey } from "@/lib/magnific-api-key";
import { getOpenAiApiKey } from "@/lib/openai-admin-status";

export type { GenerateImageResult };

/** OpenAI when configured; Magnific only if OpenAI is not set. */
export async function generateProductImage(prompt: string): Promise<GenerateImageResult> {
  if (getOpenAiApiKey()) {
    try {
      return await generateProductImageWithOpenAI(prompt);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "OpenAI generation failed";
      throw new Error(formatOpenAiImageError(msg));
    }
  }

  if (getMagnificApiKey()) {
    try {
      return await generateProductImageWithMagnific(prompt);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Magnific generation failed";
      throw new Error(formatMagnificImageError(msg));
    }
  }

  throw new Error("No image API configured. Set OPENAI_API_KEY in .env.local.");
}

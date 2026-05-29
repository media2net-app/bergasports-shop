import "server-only";

import { getOpenAiApiKey } from "@/lib/openai-admin-status";

export type GenerateImageResult = {
  pngBuffer: Buffer;
  revisedPrompt?: string;
};

type OpenAiImageItem = {
  b64_json?: string;
  url?: string;
  revised_prompt?: string;
};

type GptImageModel = "gpt-image-1-mini" | "gpt-image-1.5" | "gpt-image-1";

const GPT_IMAGE_MODELS: GptImageModel[] = ["gpt-image-1-mini", "gpt-image-1.5", "gpt-image-1"];

function isBillingHardLimit(message: string): boolean {
  return /billing hard limit/i.test(message);
}

function isModelUnavailable(message: string): boolean {
  return /does not exist|model_not_found|not available/i.test(message);
}

/** Turn raw OpenAI errors into actionable admin messages. */
export function formatOpenAiImageError(raw: string): string {
  if (isBillingHardLimit(raw)) {
    return (
      "OpenAI billing limit reached. Add credits or raise your spending limit at " +
      "https://platform.openai.com/settings/organization/billing — then try again."
    );
  }

  if (isModelUnavailable(raw) && !isBillingHardLimit(raw)) {
    return (
      "No image model is available on this API key. Enable GPT Image or DALL·E in your OpenAI " +
      "project, or use a key from an account with image generation access."
    );
  }

  return raw;
}

async function bufferFromImageItem(item: OpenAiImageItem | undefined): Promise<Buffer | null> {
  if (!item) return null;

  if (item.b64_json) {
    return Buffer.from(item.b64_json, "base64");
  }

  if (item.url) {
    const imgRes = await fetch(item.url, { signal: AbortSignal.timeout(60_000) });
    if (!imgRes.ok) {
      throw new Error(`Failed to download generated image (HTTP ${imgRes.status}).`);
    }
    const ab = await imgRes.arrayBuffer();
    return Buffer.from(ab);
  }

  return null;
}

function gptImageBody(model: GptImageModel, prompt: string): Record<string, unknown> {
  return {
    model,
    prompt: prompt.slice(0, 32000),
    n: 1,
    size: "1024x1024",
    quality: model === "gpt-image-1-mini" ? "medium" : "high",
    output_format: "png",
  };
}

export async function generateProductImageWithOpenAI(prompt: string): Promise<GenerateImageResult> {
  const key = getOpenAiApiKey();
  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const attempts: { label: string; body: Record<string, unknown> }[] = [
    ...GPT_IMAGE_MODELS.map((model) => ({ label: model, body: gptImageBody(model, prompt) })),
    {
      label: "dall-e-2",
      body: {
        model: "dall-e-2",
        prompt: prompt.slice(0, 1000),
        n: 1,
        size: "1024x1024",
      },
    },
  ];

  const errors: string[] = [];

  for (const { label, body } of attempts) {
    try {
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      });

      const json = (await res.json()) as {
        error?: { message?: string };
        data?: OpenAiImageItem[];
      };

      if (!res.ok) {
        const msg = json.error?.message ?? `OpenAI HTTP ${res.status}`;
        errors.push(`${label}: ${msg}`);

        if (isBillingHardLimit(msg)) {
          break;
        }
        continue;
      }

      const item = json.data?.[0];
      const pngBuffer = await bufferFromImageItem(item);
      if (!pngBuffer) {
        errors.push(`${label}: OpenAI returned no image data.`);
        continue;
      }

      return {
        pngBuffer,
        revisedPrompt: item?.revised_prompt,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "OpenAI request failed";
      errors.push(`${label}: ${msg}`);
    }
  }

  throw new Error(formatOpenAiImageError(errors.join(" · ") || "Image generation failed."));
}

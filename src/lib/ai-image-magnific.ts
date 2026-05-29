import "server-only";

import { getMagnificApiKey } from "@/lib/magnific-api-key";

import type { GenerateImageResult } from "@/lib/ai-image-openai";

type MagnificImageItem = {
  base64?: string;
  has_nsfw?: boolean;
};

type MagnificTextToImageResponse = {
  message?: string;
  data?: MagnificImageItem[];
  meta?: { prompt?: string };
};

const TEXT_TO_IMAGE_PATH = "/v1/ai/text-to-image";

const API_HOSTS = [
  { baseUrl: "https://api.magnific.com", header: "x-magnific-api-key" as const },
  { baseUrl: "https://api.freepik.com", header: "x-freepik-api-key" as const },
];

function decodeBase64Image(b64: string): Buffer {
  const raw = b64.replace(/^data:image\/[a-z+]+;base64,/i, "").trim();
  return Buffer.from(raw, "base64");
}

export function formatMagnificImageError(raw: string): string {
  if (/invalid api key|missing api key|unauthorized/i.test(raw)) {
    return (
      "Invalid Magnific/Freepik API key. Set MAGNIFIC_API_KEY in .env.local " +
      "(from magnific.com/developers/dashboard)."
    );
  }
  if (/insufficient|credit|quota|limit/i.test(raw)) {
    return "Magnific API credits or rate limit reached. Check billing at magnific.com/developers/dashboard.";
  }
  return raw;
}

export async function generateProductImageWithMagnific(prompt: string): Promise<GenerateImageResult> {
  const key = getMagnificApiKey();
  if (!key) {
    throw new Error("MAGNIFIC_API_KEY is not configured.");
  }

  const body = {
    prompt: prompt.slice(0, 8000),
    num_images: 1,
    guidance_scale: 1.8,
    filter_nsfw: true,
    image: { size: "square_1_1" },
    styling: {
      style: "studio-shot",
      effects: {
        lightning: "studio",
        framing: "close-up",
      },
    },
  };

  const errors: string[] = [];

  for (const host of API_HOSTS) {
    const res = await fetch(`${host.baseUrl}${TEXT_TO_IMAGE_PATH}`, {
      method: "POST",
      headers: {
        [host.header]: key,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });

    const json = (await res.json()) as MagnificTextToImageResponse;

    if (!res.ok) {
      errors.push(`${host.baseUrl}: ${json.message ?? `HTTP ${res.status}`}`);
      if (res.status === 401 || res.status === 403) continue;
      throw new Error(formatMagnificImageError(errors.join(" · ")));
    }

    const item = json.data?.[0];
    if (!item?.base64) {
      errors.push(`${host.baseUrl}: No image data in response.`);
      continue;
    }

    if (item.has_nsfw) {
      throw new Error("Magnific flagged the result as NSFW. Adjust the prompt or overlay text and try again.");
    }

    return {
      pngBuffer: decodeBase64Image(item.base64),
      revisedPrompt: json.meta?.prompt,
    };
  }

  throw new Error(formatMagnificImageError(errors.join(" · ") || "Magnific image generation failed."));
}

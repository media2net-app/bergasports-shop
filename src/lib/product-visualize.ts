import "server-only";

import { formatMissingOpenAiKeyError, getOpenAiApiKey } from "@/lib/openai-admin-status";
import { formatOpenAiImageError } from "@/lib/ai-image-openai";
import { productVisualizeScene } from "@/lib/product-visualize-config";

type OpenAiImageItem = {
  b64_json?: string;
  url?: string;
  revised_prompt?: string;
};

type GptImageModel = "gpt-image-1.5" | "gpt-image-1" | "gpt-image-1-mini";

const EDIT_MODELS: GptImageModel[] = ["gpt-image-1.5", "gpt-image-1", "gpt-image-1-mini"];

export type VisualizeProductInRoomInput = {
  roomDataUrl: string;
  productImageUrl: string;
  productName: string;
  category: string;
  siteOrigin: string;
};

export type VisualizeProductInRoomResult = {
  pngBuffer: Buffer;
  revisedPrompt?: string;
};

function resolveAbsoluteUrl(url: string, origin: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  const base = origin.replace(/\/$/, "");
  return trimmed.startsWith("/") ? `${base}${trimmed}` : `${base}/${trimmed}`;
}

async function imageRefForApi(url: string, origin: string): Promise<string> {
  const absolute = resolveAbsoluteUrl(url, origin);
  if (absolute.startsWith("data:image/")) return absolute;

  const res = await fetch(absolute, {
    signal: AbortSignal.timeout(45_000),
    headers: { Accept: "image/*" },
  });
  if (!res.ok) {
    throw new Error(`Nu am putut încărca imaginea produsului (HTTP ${res.status}).`);
  }
  const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 8 * 1024 * 1024) {
    throw new Error("Imaginea produsului este prea mare pentru previzualizare.");
  }
  return `data:${contentType};base64,${buf.toString("base64")}`;
}

function buildEditPrompt(productName: string, category: string): string {
  const scene = productVisualizeScene(category, productName);
  const safeName = productName.slice(0, 200);

  if (scene === "bathroom") {
    return (
      `Photorealistic interior photo edit. Image 1 is the customer's bathroom. Image 2 is the store product "${safeName}". ` +
      `Place or display this product naturally in the bathroom (towel on rail, folded on shelf, or robe on hook) matching colors, pattern and material from image 2. ` +
      `Keep tiles, walls, fixtures, lighting, camera angle and perspective unchanged. Only add/replace the textile product realistically.`
    );
  }

  if (scene === "bedroom") {
    return (
      `Photorealistic interior photo edit. Image 1 is the customer's bedroom with a bed. Image 2 is the store bedding product "${safeName}". ` +
      `Replace ONLY the bed textiles (sheets, duvet cover, pillowcases) on the existing bed with linens that match the colors, pattern and fabric of the product in image 2. ` +
      `Keep the room, walls, furniture, floor, lighting and camera angle identical. Natural folds and shadows on the bed. Do not change anything except bed linens.`
    );
  }

  return (
    `Photorealistic interior photo edit. Image 1 is the customer's room at home. Image 2 is the store product "${safeName}" (category: ${category.slice(0, 80)}). ` +
    `Place this product naturally and realistically in the room from image 1 — on appropriate furniture, shelf, bed, table or floor — matching colors, shape and material from image 2. ` +
    `Keep walls, layout, lighting, camera angle and perspective unchanged. Do not redesign the room; only integrate this one product believably.`
  );
}

async function bufferFromItem(item: OpenAiImageItem | undefined): Promise<Buffer | null> {
  if (!item) return null;
  if (item.b64_json) return Buffer.from(item.b64_json, "base64");
  if (item.url) {
    const imgRes = await fetch(item.url, { signal: AbortSignal.timeout(60_000) });
    if (!imgRes.ok) return null;
    return Buffer.from(await imgRes.arrayBuffer());
  }
  return null;
}

export async function visualizeProductInRoom(
  input: VisualizeProductInRoomInput,
): Promise<VisualizeProductInRoomResult> {
  const key = await getOpenAiApiKey();
  if (!key) {
    throw new Error(await formatMissingOpenAiKeyError());
  }

  const productRef = await imageRefForApi(input.productImageUrl, input.siteOrigin);
  const prompt = buildEditPrompt(input.productName, input.category);

  const bodyBase = {
    images: [{ image_url: input.roomDataUrl }, { image_url: productRef }],
    prompt,
    input_fidelity: "high" as const,
    quality: "high" as const,
    size: "auto" as const,
    output_format: "png" as const,
    n: 1,
  };

  const errors: string[] = [];

  for (const model of EDIT_MODELS) {
    try {
      const res = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...bodyBase, model }),
        signal: AbortSignal.timeout(180_000),
      });

      const json = (await res.json()) as {
        error?: { message?: string };
        data?: OpenAiImageItem[];
      };

      if (!res.ok) {
        const msg = json.error?.message ?? `OpenAI HTTP ${res.status}`;
        errors.push(`${model}: ${msg}`);
        if (/billing hard limit/i.test(msg)) break;
        continue;
      }

      const item = json.data?.[0];
      const pngBuffer = await bufferFromItem(item);
      if (!pngBuffer) {
        errors.push(`${model}: no image data`);
        continue;
      }

      return { pngBuffer, revisedPrompt: item?.revised_prompt };
    } catch (e) {
      errors.push(`${model}: ${e instanceof Error ? e.message : "request failed"}`);
    }
  }

  throw new Error(formatOpenAiImageError(errors.join(" · ") || "Previzualizarea a eșuat."));
}

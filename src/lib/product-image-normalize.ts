import "server-only";

import { formatOpenAiImageError } from "@/lib/ai-image-openai";
import { getOpenAiApiKey } from "@/lib/openai-admin-status";
import {
  buildProductImageNormalizePrompt,
  resolveProductImageNormalizeRule,
  type ProductImageNormalizeMatchInput,
  type ProductImageNormalizeRule,
} from "@/lib/product-image-normalize-config";

type OpenAiImageItem = {
  b64_json?: string;
  url?: string;
  revised_prompt?: string;
};

type GptImageModel = "gpt-image-1.5" | "gpt-image-1" | "gpt-image-1-mini";

const EDIT_MODELS: GptImageModel[] = ["gpt-image-1.5", "gpt-image-1", "gpt-image-1-mini"];

export const PRODUCT_IMAGE_NORMALIZE_TEMPLATE_ID = "photo-normalize";

export type NormalizeProductImageInput = {
  productImageUrl: string;
  productName: string;
  product: ProductImageNormalizeMatchInput;
  siteOrigin: string;
};

export type NormalizeProductImageResult = {
  pngBuffer: Buffer;
  revisedPrompt?: string;
  rule: ProductImageNormalizeRule;
  prompt: string;
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

  let res: Response;
  try {
    res = await fetch(absolute, {
      signal: AbortSignal.timeout(45_000),
      headers: { Accept: "image/*" },
    });
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new Error(
        `Productfoto laden time-out. Controleer of de URL bereikbaar is: ${absolute.slice(0, 120)}`,
      );
    }
    const detail = e instanceof Error ? e.message : "netwerkfout";
    throw new Error(`Productfoto kon niet worden opgehaald (${detail}). URL: ${absolute.slice(0, 120)}`);
  }

  if (!res.ok) {
    throw new Error(
      `Productfoto kon niet worden geladen (HTTP ${res.status}). Controleer de afbeeldings-URL.`,
    );
  }
  const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  if (contentType && !contentType.startsWith("image/") && contentType !== "application/octet-stream") {
    throw new Error(
      `URL gaf geen afbeelding terug (content-type: ${contentType}). Controleer de productfoto-URL.`,
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) {
    throw new Error("Productfoto is leeg (0 bytes).");
  }
  if (buf.length > 8 * 1024 * 1024) {
    throw new Error("Productfoto is te groot voor normalisatie (max. ~8 MB).");
  }
  return `data:${contentType};base64,${buf.toString("base64")}`;
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

/**
 * Per-product photo consistency via OpenAI images/edits.
 * Extension point for future bulk: call this once per product id.
 */
export async function normalizeProductImage(
  input: NormalizeProductImageInput,
): Promise<NormalizeProductImageResult> {
  const key = await getOpenAiApiKey();
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY ontbreekt in site_settings én env. Ga naar Admin → Instellingen → OpenAI, plak je sk-… key, klik Opslaan, en probeer opnieuw. (ChatGPT in de browser telt niet — dit is de OpenAI API-key.)",
    );
  }

  const rule = resolveProductImageNormalizeRule(input.product);
  const prompt = buildProductImageNormalizePrompt({
    productName: input.productName,
    rule,
  });
  const productRef = await imageRefForApi(input.productImageUrl, input.siteOrigin);

  const errors: string[] = [];

  for (const model of EDIT_MODELS) {
    // input_fidelity is unsupported on gpt-image-1-mini
    const body: Record<string, unknown> = {
      model,
      images: [{ image_url: productRef }],
      prompt,
      quality: "high",
      size: "1024x1024",
      output_format: "png",
      n: 1,
    };
    if (model !== "gpt-image-1-mini") {
      body.input_fidelity = "high";
    }

    try {
      const res = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(180_000),
      });

      let json: {
        error?: { message?: string; code?: string; type?: string };
        data?: OpenAiImageItem[];
      };
      try {
        json = (await res.json()) as typeof json;
      } catch {
        errors.push(`${model}: OpenAI gaf geen JSON terug (HTTP ${res.status})`);
        continue;
      }

      if (!res.ok) {
        const msg = json.error?.message ?? `OpenAI HTTP ${res.status}`;
        errors.push(`${model}: ${msg}`);
        if (/billing hard limit/i.test(msg) || res.status === 401 || res.status === 403) break;
        continue;
      }

      const item = json.data?.[0];
      const pngBuffer = await bufferFromItem(item);
      if (!pngBuffer) {
        errors.push(`${model}: OpenAI gaf geen afbeeldingsdata terug`);
        continue;
      }

      return {
        pngBuffer,
        revisedPrompt: item?.revised_prompt,
        rule,
        prompt,
      };
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      if (name === "TimeoutError" || name === "AbortError") {
        errors.push(`${model}: OpenAI time-out (geen antwoord binnen 180s)`);
      } else {
        errors.push(`${model}: ${e instanceof Error ? e.message : "request failed"}`);
      }
    }
  }

  throw new Error(formatOpenAiImageError(errors.join(" · ") || "Foto-normalisatie mislukt."));
}

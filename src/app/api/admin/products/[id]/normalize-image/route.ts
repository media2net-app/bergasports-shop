import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { adminSessionCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";
import { markAiGeneratedImageInstalled, saveAiGeneratedImage } from "@/lib/ai-generated-images-db";
import { emptyAiImageOverlayValues } from "@/lib/ai-image-overlay";
import { probeOpenAiApiKeySources } from "@/lib/openai-admin-status";
import {
  normalizeProductImage,
  PRODUCT_IMAGE_NORMALIZE_TEMPLATE_ID,
} from "@/lib/product-image-normalize";
import { productPath, resolveProductSlug } from "@/lib/product-slug";
import { siteOrigin } from "@/lib/seo";
import { getProductRawById, isWritableFilesystem, upsertProductRaw } from "@/lib/trendyol-json-store";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

type RouteParams = { params: Promise<{ id: string }> };

async function guard() {
  const token = (await cookies()).get(adminSessionCookieName())?.value;
  if (!token || !(await verifyAdminSessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function originFromRequest(request: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return siteOrigin();
}

/**
 * Per-product photo consistency (OpenAI images/edits).
 * Body: { apply?: boolean } — when apply is true (default), set result as main product image.
 * Bulk queue can call this endpoint once per product id later.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const denied = await guard();
  if (denied) return denied;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Ongeldig product-id" }, { status: 400 });
  }

  let apply = true;
  try {
    const body = (await request.json()) as { apply?: unknown };
    if (typeof body.apply === "boolean") apply = body.apply;
  } catch {
    /* empty body ok */
  }

  const product = await getProductRawById(id);
  if (!product) {
    return NextResponse.json({ error: "Product niet gevonden" }, { status: 404 });
  }

  const sourceImageUrl = (product.image || product.images?.[0] || "").trim();
  if (!sourceImageUrl) {
    return NextResponse.json({ error: "Dit product heeft geen foto om te normaliseren." }, { status: 400 });
  }

  try {
    const { pngBuffer, revisedPrompt, rule, prompt } = await normalizeProductImage({
      productImageUrl: sourceImageUrl,
      productName: product.name,
      product: {
        category: product.category,
        name: product.name,
        wcCategories: product.wcCategories,
      },
      siteOrigin: originFromRequest(request),
    });

    const stored = await saveAiGeneratedImage({
      pngBuffer,
      productId: id,
      productName: product.name,
      templateId: PRODUCT_IMAGE_NORMALIZE_TEMPLATE_ID,
      shopCategorySlug: product.wcCategories?.[0]?.slug ?? null,
      sourceImageUrl,
      referenceImageUrl: null,
      prompt: revisedPrompt ? `${prompt}\n\n(OpenAI revised: ${revisedPrompt})` : prompt,
      overlay: emptyAiImageOverlayValues(),
      include: {
        setQuantity: false,
        productTitle: false,
        dimensions: false,
        madeInRomania: false,
        catalogExtras: false,
      },
    });

    let applied = false;
    if (apply) {
      if (!isWritableFilesystem()) {
        return NextResponse.json(
          {
            ok: true,
            applied: false,
            imageUrl: stored.public_url,
            generatedId: stored.id,
            rule: { family: rule.family, label: rule.label },
            libraryUrl: `/admin/ai-images/library?id=${stored.id}`,
            warning:
              "Foto gegenereerd, maar opslaan op het product is hier uitgeschakeld. Gebruik de library-URL of bewerk lokaal.",
          },
          { status: 200 },
        );
      }

      const imageUrl = stored.public_url;
      const images = [imageUrl, ...(product.images ?? []).filter((u) => u && u !== imageUrl && u !== sourceImageUrl)];
      if (sourceImageUrl && sourceImageUrl !== imageUrl) {
        images.push(sourceImageUrl);
      }

      await upsertProductRaw({
        ...product,
        image: imageUrl,
        images,
      });
      await markAiGeneratedImageInstalled(stored.id);
      applied = true;

      revalidatePath("/admin/products");
      revalidatePath(`/admin/products/${id}`);
      revalidatePath("/shop");
      revalidatePath(productPath(resolveProductSlug(product)));
      revalidatePath(`/product/${id}`);
    }

    return NextResponse.json({
      ok: true,
      applied,
      imageUrl: stored.public_url,
      generatedId: stored.id,
      rule: { family: rule.family, label: rule.label },
      libraryUrl: `/admin/ai-images/library?id=${stored.id}`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Normalisatie mislukt";
    const status = statusForNormalizeError(message);
    // Temporary admin debug: boolean presence only (no secrets) when key is missing.
    if (status === 503 && /ontbreekt|not configured|openai_api_key/i.test(message)) {
      const probe = await probeOpenAiApiKeySources();
      return NextResponse.json(
        {
          error: message,
          debug: {
            hint: "Alleen of-gevuld (geen secrets). Key hoort in Instellingen → OpenAI (site_settings.OPENAI_API_KEY).",
            probe,
          },
        },
        { status },
      );
    }
    return NextResponse.json({ error: message }, { status });
  }
}

/** Map known failure modes to actionable HTTP statuses (avoid opaque 502 for config/input errors). */
function statusForNormalizeError(message: string): number {
  const m = message.toLowerCase();
  // Config / billing — service not usable until operator fixes account or settings
  if (
    m.includes("openai_api_key") ||
    m.includes("not configured") ||
    m.includes("ontbreekt") ||
    m.includes("getruntimesetting") ||
    m.includes("site_settings") ||
    m.includes("billing") ||
    m.includes("spending limit") ||
    m.includes("tegoedlimiet") ||
    m.includes("insufficient_quota") ||
    m.includes("quota op")
  ) {
    return 503;
  }
  if (
    m.includes("unauthorized") ||
    m.includes("invalid api key") ||
    m.includes("incorrect api key") ||
    m.includes("weigert de api-key") ||
    m.includes("authentication")
  ) {
    return 401;
  }
  if (
    m.includes("te groot") ||
    m.includes("geen foto") ||
    m.includes("leeg") ||
    m.includes("geen afbeelding") ||
    m.includes("content-type")
  ) {
    return 400;
  }
  if (m.includes("time-out") || m.includes("timeout")) {
    return 504;
  }
  if (
    m.includes("kon niet worden geladen") ||
    m.includes("kon niet worden opgehaald") ||
    m.includes("niet bereikbaar")
  ) {
    return 502;
  }
  // OpenAI upstream / generation failures — keep full message in JSON body
  return 502;
}

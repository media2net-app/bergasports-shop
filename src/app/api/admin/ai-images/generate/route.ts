import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { adminSessionCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";
import { saveAiGeneratedImage } from "@/lib/ai-generated-images-db";
import { DEFAULT_AI_INCLUDE_FLAGS, type AiImageIncludeFlags, type AiImageOverlayValues } from "@/lib/ai-image-overlay";
import { getAiImageTemplateById, buildPromptFromTemplate } from "@/lib/ai-image-templates";
import { generateProductImage } from "@/lib/ai-image-generate";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function guard() {
  const token = (await cookies()).get(adminSessionCookieName())?.value;
  if (!token || !(await verifyAdminSessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const templateId = String(o.templateId ?? "").trim();
  const template = getAiImageTemplateById(templateId);
  if (!template) {
    return NextResponse.json({ error: "Unknown template" }, { status: 400 });
  }

  const sourceImageUrl = typeof o.sourceImageUrl === "string" ? o.sourceImageUrl.trim() : "";
  if (!sourceImageUrl) {
    return NextResponse.json({ error: "Source product image is required." }, { status: 400 });
  }

  const overlay = o.overlay as AiImageOverlayValues | undefined;
  if (!overlay) {
    return NextResponse.json({ error: "Missing overlay values" }, { status: 400 });
  }

  const include: AiImageIncludeFlags = {
    ...DEFAULT_AI_INCLUDE_FLAGS,
    ...(o.include as Partial<AiImageIncludeFlags> | undefined),
  };

  const referenceImageUrl =
    typeof o.referenceImageUrl === "string" && o.referenceImageUrl.trim()
      ? o.referenceImageUrl.trim()
      : template.referenceImageUrl;

  const productId = typeof o.productId === "number" ? o.productId : null;
  const productName = typeof o.productName === "string" ? o.productName : null;
  const shopCategorySlug = typeof o.shopCategorySlug === "string" ? o.shopCategorySlug : null;
  const overlayExtraText = typeof o.overlayExtraText === "string" ? o.overlayExtraText : undefined;

  const prompt = buildPromptFromTemplate(template, {
    overlay,
    include,
    referenceImageUrl,
    sourceImageUrl,
    sourceProductName: productName ?? undefined,
    overlayExtraText,
  });

  try {
    const { pngBuffer, revisedPrompt } = await generateProductImage(prompt);

    const row = await saveAiGeneratedImage({
      pngBuffer,
      productId,
      productName,
      templateId,
      shopCategorySlug,
      sourceImageUrl,
      referenceImageUrl,
      prompt: revisedPrompt ? `${prompt}\n\n(OpenAI revised: ${revisedPrompt})` : prompt,
      overlay,
      include,
    });

    return NextResponse.json({
      ok: true,
      image: row,
      libraryUrl: `/admin/ai-images/library?id=${row.id}`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

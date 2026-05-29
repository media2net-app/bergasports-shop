import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

import type { AiImageIncludeFlags, AiImageOverlayValues } from "@/lib/ai-image-overlay";
import { requirePrisma } from "@/lib/database";

export type AiGeneratedImageRow = {
  id: string;
  product_id: number | null;
  product_name: string | null;
  template_id: string;
  shop_category_slug: string | null;
  source_image_url: string | null;
  reference_image_url: string | null;
  storage_path: string;
  public_url: string;
  prompt: string;
  overlay: AiImageOverlayValues | null;
  include_flags: AiImageIncludeFlags | null;
  installed_at: string | null;
  created_at: string;
};

function prismaToRow(row: {
  id: string;
  productId: number | null;
  productName: string | null;
  templateId: string;
  shopCategorySlug: string | null;
  sourceImageUrl: string | null;
  referenceImageUrl: string | null;
  storagePath: string;
  publicUrl: string;
  prompt: string;
  overlay: Prisma.JsonValue | null;
  includeFlags: Prisma.JsonValue | null;
  installedAt: Date | null;
  createdAt: Date;
}): AiGeneratedImageRow {
  return {
    id: row.id,
    product_id: row.productId,
    product_name: row.productName,
    template_id: row.templateId,
    shop_category_slug: row.shopCategorySlug,
    source_image_url: row.sourceImageUrl,
    reference_image_url: row.referenceImageUrl,
    storage_path: row.storagePath,
    public_url: row.publicUrl,
    prompt: row.prompt,
    overlay: row.overlay as AiImageOverlayValues | null,
    include_flags: row.includeFlags as AiImageIncludeFlags | null,
    installed_at: row.installedAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
  };
}

export async function listAiGeneratedImages(limit = 50): Promise<AiGeneratedImageRow[]> {
  const prisma = requirePrisma();
  const rows = await prisma.aiGeneratedImage.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(prismaToRow);
}

export async function getAiGeneratedImageById(id: string): Promise<AiGeneratedImageRow | null> {
  const prisma = requirePrisma();
  const row = await prisma.aiGeneratedImage.findUnique({ where: { id } });
  return row ? prismaToRow(row) : null;
}

async function saveToPublicFolder(storagePath: string, buffer: Buffer): Promise<string> {
  const rel = storagePath.replace(/^ai-generated\//, "");
  const filePath = path.join(process.cwd(), "public", "admin", "ai-generated", rel);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer);
  return `/admin/ai-generated/${rel}`;
}

export async function saveAiGeneratedImage(params: {
  pngBuffer: Buffer;
  productId: number | null;
  productName: string | null;
  templateId: string;
  shopCategorySlug: string | null;
  sourceImageUrl: string | null;
  referenceImageUrl: string | null;
  prompt: string;
  overlay: AiImageOverlayValues;
  include: AiImageIncludeFlags;
}): Promise<AiGeneratedImageRow> {
  const prisma = requirePrisma();
  const id = randomUUID();
  const storagePath = `ai-generated/${id}.png`;
  const publicUrl = await saveToPublicFolder(storagePath, params.pngBuffer);

  const row = await prisma.aiGeneratedImage.create({
    data: {
      id,
      productId: params.productId,
      productName: params.productName,
      templateId: params.templateId,
      shopCategorySlug: params.shopCategorySlug,
      sourceImageUrl: params.sourceImageUrl,
      referenceImageUrl: params.referenceImageUrl,
      storagePath,
      publicUrl,
      prompt: params.prompt,
      overlay: params.overlay as unknown as Prisma.InputJsonValue,
      includeFlags: params.include as unknown as Prisma.InputJsonValue,
    },
  });
  return prismaToRow(row);
}

export async function markAiGeneratedImageInstalled(id: string): Promise<void> {
  const prisma = requirePrisma();
  await prisma.aiGeneratedImage.update({
    where: { id },
    data: { installedAt: new Date() },
  });
}

export async function deleteAiGeneratedImage(id: string): Promise<void> {
  const row = await getAiGeneratedImageById(id);
  if (!row) {
    return;
  }

  const rel = row.storage_path.replace(/^ai-generated\//, "");
  const filePath = path.join(process.cwd(), "public", "admin", "ai-generated", rel);
  try {
    await unlink(filePath);
  } catch {
    /* file may not exist */
  }

  const prisma = requirePrisma();
  await prisma.aiGeneratedImage.delete({ where: { id } });
}

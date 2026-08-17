import "server-only";

import { getPrisma } from "@/lib/prisma";

export type MediaAssetRow = {
  id: string;
  url: string;
  pathname: string;
  filename: string;
  alt: string | null;
  contentType: string | null;
  byteSize: number | null;
  folder: string;
  createdAt: Date;
};

export async function recordMediaAsset(input: {
  url: string;
  pathname: string;
  filename: string;
  alt?: string | null;
  contentType?: string | null;
  byteSize?: number | null;
  folder?: string;
}): Promise<MediaAssetRow | null> {
  const prisma = getPrisma();
  if (!prisma) return null;
  try {
    return await prisma.mediaAsset.create({
      data: {
        url: input.url,
        pathname: input.pathname,
        filename: input.filename,
        alt: input.alt ?? null,
        contentType: input.contentType ?? null,
        byteSize: input.byteSize ?? null,
        folder: input.folder ?? "uploads",
      },
    });
  } catch {
    return null;
  }
}

export async function listMediaAssets(limit = 80): Promise<MediaAssetRow[]> {
  const prisma = getPrisma();
  if (!prisma) return [];
  try {
    return await prisma.mediaAsset.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch {
    return [];
  }
}

export async function updateMediaAssetAlt(id: string, alt: string): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) throw new Error("DATABASE_URL ontbreekt");
  await prisma.mediaAsset.update({ where: { id }, data: { alt: alt.trim() || null } });
}

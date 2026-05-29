import "server-only";

import { requirePrisma } from "@/lib/database";

export type AiImageTemplateMappingsFile = {
  version: 1;
  mappings: Record<string, string>;
  updatedAt: string;
};

export async function readAiImageTemplateMappings(): Promise<Record<string, string>> {
  const prisma = requirePrisma();
  const rows = await prisma.aiImageCategoryTemplate.findMany({
    select: { categorySlug: true, templateId: true },
  });
  const out: Record<string, string> = {};
  for (const row of rows) {
    const slug = row.categorySlug.trim();
    const templateId = row.templateId.trim();
    if (slug && templateId) {
      out[slug.toLowerCase()] = templateId;
    }
  }
  return out;
}

export async function writeAiImageTemplateMappings(mappings: Record<string, string>): Promise<void> {
  const prisma = requirePrisma();
  const cleaned: { categorySlug: string; templateId: string }[] = [];
  for (const [slug, templateId] of Object.entries(mappings)) {
    const s = slug.trim().toLowerCase();
    const t = templateId.trim();
    if (s && t) {
      cleaned.push({ categorySlug: s, templateId: t });
    }
  }

  const existing = await prisma.aiImageCategoryTemplate.findMany({
    select: { categorySlug: true },
  });
  const nextSlugs = new Set(cleaned.map((r) => r.categorySlug));
  const toDelete = existing.map((r) => r.categorySlug).filter((slug) => !nextSlugs.has(slug));

  if (toDelete.length) {
    await prisma.aiImageCategoryTemplate.deleteMany({
      where: { categorySlug: { in: toDelete } },
    });
  }

  for (const row of cleaned) {
    await prisma.aiImageCategoryTemplate.upsert({
      where: { categorySlug: row.categorySlug },
      create: row,
      update: { templateId: row.templateId },
    });
  }
}

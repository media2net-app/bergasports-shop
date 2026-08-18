import type { PrismaClient } from "@/generated/prisma/client";
import {
  isWpQuerySource,
  normalizeRedirectPath,
  shouldSkipRedirect,
  STATIC_EXACT_SEO_REDIRECTS,
  type SeoRedirectKind,
} from "@/lib/seo-redirects-static";

export async function upsertSeoRedirect(
  prisma: PrismaClient,
  source: string,
  destination: string,
  kind: SeoRedirectKind,
): Promise<"created" | "updated" | "skipped"> {
  const sourcePath = isWpQuerySource(source.trim()) ? source.trim() : normalizeRedirectPath(source);
  const destinationPath = normalizeRedirectPath(destination);
  if (shouldSkipRedirect(sourcePath, destinationPath)) return "skipped";

  try {
    const existing = await prisma.seoRedirect.findUnique({
      where: { sourcePath },
      select: { kind: true, destinationPath: true },
    });
    if (existing?.kind === "manual") return "skipped";
    if (existing) {
      if (existing.destinationPath === destinationPath) return "skipped";
      await prisma.seoRedirect.update({
        where: { sourcePath },
        data: { destinationPath, kind, enabled: true, statusCode: 301 },
      });
      return "updated";
    }
    await prisma.seoRedirect.create({
      data: { sourcePath, destinationPath, kind, statusCode: 301, enabled: true },
    });
    return "created";
  } catch {
    return "skipped";
  }
}

export async function upsertSeoRedirects(
  prisma: PrismaClient,
  sources: string[],
  destination: string,
  kind: SeoRedirectKind,
): Promise<{ created: number; updated: number; skipped: number }> {
  const result = { created: 0, updated: 0, skipped: 0 };
  for (const source of sources) {
    const action = await upsertSeoRedirect(prisma, source, destination, kind);
    result[action] += 1;
  }
  return result;
}

export async function seedStaticSeoRedirects(prisma: PrismaClient): Promise<void> {
  for (const [source, destination] of Object.entries(STATIC_EXACT_SEO_REDIRECTS)) {
    await upsertSeoRedirect(prisma, source, destination, "static");
  }
}

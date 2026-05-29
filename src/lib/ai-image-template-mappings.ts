import { flattenRalexCategoryTree, type RalexCategoryNode } from "@/lib/ralex-categories";

/** Walk up category tree: child inherits parent mapping when no direct mapping. */
export function resolveTemplateIdForCategorySlug(
  mappings: Record<string, string>,
  categoryTree: RalexCategoryNode[],
  categorySlug: string,
): string | null {
  const flat = flattenRalexCategoryTree(categoryTree);
  let slug: string | null = categorySlug.trim().toLowerCase();
  if (!slug) {
    return null;
  }

  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(mappings)) {
    normalized[k.trim().toLowerCase()] = v;
  }

  const seen = new Set<string>();
  while (slug && !seen.has(slug)) {
    seen.add(slug);
    const direct = normalized[slug];
    if (direct) {
      return direct;
    }
    const node = flat.find((n) => n.slug.toLowerCase() === slug);
    if (!node?.parent) {
      break;
    }
    const parent = flat.find((n) => n.id === node.parent);
    slug = parent?.slug.toLowerCase() ?? null;
  }
  return null;
}

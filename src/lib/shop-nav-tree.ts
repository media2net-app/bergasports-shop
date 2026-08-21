import {
  flattenRalexCategoryTree,
  type RalexCategoryNode,
} from "@/lib/ralex-categories";

/** Ouder voor fietsschoenen + kleding in de publieke boom. */
export const SHOES_CLOTHING_NAV_SLUG = "schoenen-kleding";

/** Publieke top-order: Fietsen · Skeelers · Schoenen & kleding · Wielen · Accessoires */
const NAV_ROOT_ORDER = [
  "bikes",
  "speed-skates",
  SHOES_CLOTHING_NAV_SLUG,
  "wheels",
  "accessories",
];

const CHILD_ORDER: Record<string, string[]> = {
  bikes: ["road-bike", "gravelbike", "mtb", "used-bikes"],
  "speed-skates": ["complete-skates", "skate-shoes", "skate-wheels", "skate-bearings"],
  [SHOES_CLOTHING_NAV_SLUG]: ["cycling-shoes", "lafuga-wear"],
  wheels: ["scope-outlet"],
  accessories: ["cycling-helmets", "glasses", "group-sets", "cleats"],
};

/** Woo top-level → gewenste NL-ouder (slug). */
const REPARENT: Record<string, string> = {
  glasses: "accessories",
  "scope-outlet": "wheels",
  "used-bikes": "bikes",
  "cycling-shoes": SHOES_CLOTHING_NAV_SLUG,
  "lafuga-wear": SHOES_CLOTHING_NAV_SLUG,
};

function slugKey(slug: string): string {
  return slug.trim().toLowerCase();
}

/** Lege Engelse restcategorieën / gravel-duplicaat: niet in menu of sidebar. */
export function isOmittedFromPublicNav(node: { slug: string; count: number }): boolean {
  const slug = slugKey(node.slug);
  if (slug === "gravel-bike") {
    return true;
  }
  if (slug === "used-bikes" && node.count <= 0) {
    return true;
  }
  return false;
}

export function visiblePublicNavTree(tree: RalexCategoryNode[]): RalexCategoryNode[] {
  return tree
    .filter((node) => !isOmittedFromPublicNav(node))
    .map((node) => ({
      ...node,
      children: visiblePublicNavTree(node.children ?? []),
    }));
}

function sortChildren(parentSlug: string, kids: RalexCategoryNode[]): RalexCategoryNode[] {
  const order = CHILD_ORDER[slugKey(parentSlug)] ?? [];
  const bySlug = new Map(kids.map((kid) => [slugKey(kid.slug), kid]));
  const seen = new Set<string>();
  const ordered: RalexCategoryNode[] = [];
  for (const slug of order) {
    const kid = bySlug.get(slug);
    if (kid) {
      ordered.push(kid);
      seen.add(slug);
    }
  }
  for (const kid of kids) {
    const slug = slugKey(kid.slug);
    if (!seen.has(slug)) {
      ordered.push(kid);
    }
  }
  return ordered;
}

/**
 * Herschikt de Woo-boom naar de publieke NL-IA zonder productkoppelingen te wijzigen.
 * Verborgen slugs blijven in de boom voor URL-resolutie (`/tweedehands`, `/gravel-bike`).
 */
export function toPublicShopNavTree(tree: RalexCategoryNode[]): RalexCategoryNode[] {
  const flat = flattenRalexCategoryTree(tree);
  if (!flat.length) {
    return tree;
  }

  const bySlug = new Map<string, RalexCategoryNode>();
  for (const node of flat) {
    bySlug.set(slugKey(node.slug), { ...node, children: [] });
  }

  for (const [childSlug, parentSlug] of Object.entries(REPARENT)) {
    const child = bySlug.get(childSlug);
    const parent = bySlug.get(parentSlug);
    if (child && parent) {
      child.parent = parent.id;
    }
  }

  // Schoenen & kleding altijd topniveau; children hangen via REPARENT.
  const shoesClothing = bySlug.get(SHOES_CLOTHING_NAV_SLUG);
  if (shoesClothing) {
    shoesClothing.parent = 0;
  }

  const childrenByParent = new Map<number, RalexCategoryNode[]>();
  const nodes = [...bySlug.values()];
  for (const node of nodes) {
    if (node.parent === 0) {
      continue;
    }
    const list = childrenByParent.get(node.parent) ?? [];
    list.push(node);
    childrenByParent.set(node.parent, list);
  }

  function attach(node: RalexCategoryNode): RalexCategoryNode {
    const kids = sortChildren(node.slug, childrenByParent.get(node.id) ?? []);
    return { ...node, children: kids.map(attach) };
  }

  const roots = nodes.filter((node) => node.parent === 0);
  const used = new Set<string>();
  const orderedRoots: RalexCategoryNode[] = [];
  for (const slug of NAV_ROOT_ORDER) {
    const root = roots.find((node) => slugKey(node.slug) === slug);
    if (root) {
      orderedRoots.push(root);
      used.add(slugKey(root.slug));
    }
  }
  for (const root of roots) {
    const slug = slugKey(root.slug);
    if (!used.has(slug) && !isOmittedFromPublicNav(root)) {
      orderedRoots.push(root);
    }
  }

  return orderedRoots.map(attach);
}

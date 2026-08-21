import { categoryShopHref } from "@/lib/category-shop-link";
import type { RalexCategoryNode } from "@/lib/ralex-categories";
import type { ShopMegaMenuColumn, ShopMenuLink } from "@/lib/site-content";
import { BERGASPORTS_CATEGORY_PATHS } from "@/lib/site-content";

function nodeHref(node: RalexCategoryNode): string {
  return categoryShopHref(node.slug);
}

/**
 * Bouwt het webshop mega-menu uit de publieke categorieboom (DB).
 * Extra: Custom LaFuga onder Schoenen & kleding / Kleding.
 */
export function megaMenuColumnsFromCategoryTree(
  tree: RalexCategoryNode[],
  opts?: { allLabel?: string; customApparelLabel?: string },
): ShopMegaMenuColumn[] {
  const allLabel = opts?.allLabel ?? "Alles";
  const customLabel = opts?.customApparelLabel ?? "Custom / maatwerk";

  return tree.map((node) => {
    const href = nodeHref(node);
    const kids = node.children ?? [];
    const links: ShopMenuLink[] = [];

    if (kids.length > 0) {
      links.push({ href, label: allLabel });
      for (const child of kids) {
        links.push({ href: nodeHref(child), label: child.name });
      }
    }

    const slug = node.slug.trim().toLowerCase();
    if (slug === "schoenen-kleding" || slug === "lafuga-wear") {
      const customHref = BERGASPORTS_CATEGORY_PATHS.lafugaCustom;
      if (!links.some((l) => l.href === customHref)) {
        links.push({ href: customHref, label: customLabel });
      }
    }

    return {
      title: node.name,
      href,
      links,
    };
  });
}

/** Mobiel: zelfde DB-boom + vaste shop-items eromheen. */
export function mobileNavFromCategoryTree(
  tree: RalexCategoryNode[],
  labels: {
    allProducts: string;
    allIn: (title: string) => string;
    news: string;
    about: string;
    customApparel: string;
    aboutLinks: ShopMenuLink[];
  },
): {
  label: string;
  href?: string;
  badge?: string;
  children?: ShopMenuLink[];
}[] {
  const columns = megaMenuColumnsFromCategoryTree(tree, {
    allLabel: "Alles",
    customApparelLabel: labels.customApparel,
  });

  return [
    { label: labels.allProducts, href: "/shop" },
    ...columns.map((column) =>
      column.links.length > 0
        ? {
            label: column.title,
            children: [
              ...(column.href
                ? [{ href: column.href, label: labels.allIn(column.title) }]
                : []),
              ...column.links.filter(
                (l) => !(column.href && l.href === column.href && l.label === "Alles"),
              ),
            ],
          }
        : { label: column.title, href: column.href },
    ),
    { label: labels.news, href: "/nieuws" },
    { label: labels.customApparel, href: BERGASPORTS_CATEGORY_PATHS.lafugaCustom },
    { label: labels.about, children: labels.aboutLinks },
  ];
}

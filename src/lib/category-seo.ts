import { productPath } from "@/lib/product-slug";
import { decodeImportedProductTitle, type Product } from "@/lib/products";
import { formatRalexCategoryName, type RalexCategoryNode } from "@/lib/ralex-categories";
import { SITE_BRAND_SHORT } from "@/lib/site-brand";
import { shopCategoryPath } from "@/lib/shop-category-filter";

export type CategorySeoLink = {
  label: string;
  href: string;
};

export type CategorySeoContent = {
  intro: string;
  metaDescription: string;
  footerTitle: string;
  footerParagraphs: string[];
  productLinks: CategorySeoLink[];
  relatedCategoryLinks: CategorySeoLink[];
  /** Admin override for footer (HTML). */
  customFooterHtml: string | null;
};

function categoryTopicPhrase(slug: string, displayName: string): string {
  const s = slug.toLowerCase();
  if (s.includes("bike") || s === "used-bikes") {
    return "racefietsen en fietsen";
  }
  if (s.includes("wheel") || s.includes("scope")) {
    return "fietwielen en wielsets";
  }
  if (s.includes("shoe") || s.includes("cleat")) {
    return "wielrenschoenen en schoenplaatjes";
  }
  if (s.includes("helmet")) {
    return "fietshelmen";
  }
  if (s.includes("glass")) {
    return "sportbrillen";
  }
  if (s.includes("wear") || s.includes("lafuga")) {
    return "fietskleding";
  }
  if (s.includes("skate")) {
    return "skeelers en schaatsmateriaal";
  }
  if (s.includes("accessor")) {
    return "fietsaccessoires";
  }
  if (s.includes("group")) {
    return "groepssets en onderdelen";
  }
  return displayName.toLowerCase();
}

function pickProductLinks(products: Product[], limit = 12): CategorySeoLink[] {
  const seen = new Set<number>();
  const out: CategorySeoLink[] = [];
  for (const p of products) {
    if (seen.has(p.id)) {
      continue;
    }
    seen.add(p.id);
    const label = decodeImportedProductTitle(p.name).trim();
    if (!label) {
      continue;
    }
    out.push({
      label: label.length > 72 ? `${label.slice(0, 69)}…` : label,
      href: productPath(p),
    });
    if (out.length >= limit) {
      break;
    }
  }
  return out;
}

function pickRelatedCategories(
  node: RalexCategoryNode,
  tree: RalexCategoryNode[],
  limit = 8,
): CategorySeoLink[] {
  const out: CategorySeoLink[] = [];
  const push = (n: RalexCategoryNode) => {
    if (n.slug === node.slug) {
      return;
    }
    out.push({
      label: formatRalexCategoryName(n.name),
      href: shopCategoryPath(n.slug),
    });
  };

  for (const child of node.children ?? []) {
    if (out.length >= limit) {
      break;
    }
    push(child);
  }

  if (out.length < limit && node.parent > 0) {
    const findParent = (nodes: RalexCategoryNode[]): RalexCategoryNode | null => {
      for (const n of nodes) {
        if (n.id === node.parent) {
          return n;
        }
        const inChild = findParent(n.children ?? []);
        if (inChild) {
          return inChild;
        }
      }
      return null;
    };
    const parent = findParent(tree);
    if (parent) {
      for (const sib of parent.children ?? []) {
        if (out.length >= limit) {
          break;
        }
        push(sib);
      }
    }
  }

  if (out.length < limit) {
    for (const root of tree) {
      if (out.length >= limit) {
        break;
      }
      if (root.slug !== node.slug) {
        push(root);
      }
    }
  }

  return out.slice(0, limit);
}

export function buildCategorySeoContent(params: {
  categoryNode: RalexCategoryNode;
  categoryTree: RalexCategoryNode[];
  productsInCategory: Product[];
  customIntro?: string | null;
  customFooterHtml?: string | null;
}): CategorySeoContent {
  const displayName = formatRalexCategoryName(params.categoryNode.name);
  const slug = params.categoryNode.slug;
  const count = params.productsInCategory.length;
  const topic = categoryTopicPhrase(slug, displayName);
  const productLinks = pickProductLinks(params.productsInCategory);
  const relatedCategoryLinks = pickRelatedCategories(params.categoryNode, params.categoryTree);

  const countLabel = count > 0 ? `${count} producten` : "actueel assortiment";

  const intro =
    params.customIntro?.trim() ||
    `Ontdek ${countLabel} in de categorie ${displayName} bij ${SITE_BRAND_SHORT}. ` +
      `Online vind je ${topic}, met levering in Nederland en België, snelle bestelling en rembours bij aflevering.`;

  const metaDescription =
    intro.length > 155 ? `${intro.slice(0, 152).trim()}…` : intro;

  const footerTitle = `${displayName} – online bij ${SITE_BRAND_SHORT}`;

  const footerParagraphs = [
    `Bij ${SITE_BRAND_SHORT} vind je in de categorie ${displayName} een selectie ${topic} voor serieuze fietsers en atleten. ` +
      `Vergelijk modellen, maten en specificaties direct op de site — van racefiets tot wielen, schoenen en accessoires.`,
    `Bestellen is eenvoudig: voeg producten toe aan je winkelwagen, vul je bezorggegevens in en betaal rembours bij ontvangst. ` +
      `Controleer de productbeschrijving voor maat, materiaal en technische details vóór je bestelt.`,
    count > 0
      ? `In deze categorie staan nu ${count} artikelen in de webshop. ` +
        `Gebruik de filters voor kleur en maat links om snel de juiste variant te vinden.`
      : `Het assortiment in deze categorie wordt regelmatig bijgewerkt. Kom later terug of bekijk andere categorieën in de webshop.`,
    `Vragen over beschikbaarheid of levering? Neem contact op via de contactpagina. ` +
      `${SITE_BRAND_SHORT} helpt je met persoonlijk advies en een veilige online winkelervaring.`,
  ];

  return {
    intro,
    metaDescription,
    footerTitle,
    footerParagraphs,
    productLinks,
    relatedCategoryLinks,
    customFooterHtml: params.customFooterHtml?.trim() || null,
  };
}

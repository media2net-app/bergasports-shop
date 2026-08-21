import { categoryCopyForSlug } from "@/lib/category-copy";
import { categoryDisplayName, categorySeoDefaults } from "@/lib/category-meta";
import { LAFUGA_HEADING } from "@/lib/lafuga-copy";
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

function categoryTopicPhrase(slug: string, displayName: string, locale: string): string {
  const s = slug.toLowerCase();
  const en = locale === "en";
  if (s.includes("bike") || s === "used-bikes") {
    return en ? "road bikes and bikes" : "racefietsen en fietsen";
  }
  if (s === "skate-wheels" || s.includes("skate-wheel")) {
    return en ? "inline skate wheels" : "skeelerwielen";
  }
  if (s.includes("wheel") || s.includes("scope")) {
    return en ? "bike wheels and wheelsets" : "fietswielen en wielsets";
  }
  if (s === "skate-shoes" || s.includes("skate-shoe")) {
    return en ? "skate boots" : "skeelerschoenen";
  }
  if (s === "skate-bearings") {
    return en ? "skate bearings" : "skeelerlagers";
  }
  if (s === "complete-skates") {
    return en ? "complete speed skates" : "complete skeelers";
  }
  if (s.includes("shoe") || s.includes("cleat")) {
    return en ? "cycling shoes and cleats" : "wielrenschoenen en schoenplaatjes";
  }
  if (s.includes("helmet")) {
    return en ? "cycling helmets" : "fietshelmen";
  }
  if (s.includes("glass")) {
    return en ? "sports glasses" : "sportbrillen";
  }
  if (s.includes("wear") || s.includes("lafuga")) {
    return en ? "cycling apparel" : "fietskleding";
  }
  if (s.includes("skate")) {
    return en ? "speed skates and skating gear" : "skeelers en schaatsmateriaal";
  }
  if (s.includes("accessor")) {
    return en ? "cycling accessories" : "fietsaccessoires";
  }
  if (s.includes("group")) {
    return en ? "groupsets and parts" : "groepsets en onderdelen";
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
  locale: string,
  limit = 8,
): CategorySeoLink[] {
  const out: CategorySeoLink[] = [];
  const push = (n: RalexCategoryNode) => {
    if (n.slug === node.slug) {
      return;
    }
    out.push({
      label: formatRalexCategoryName(n.name, n.slug, locale),
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
  locale?: string;
}): CategorySeoContent {
  const locale = params.locale === "en" ? "en" : "nl";
  const slug = params.categoryNode.slug;
  const displayName = categoryDisplayName(slug, formatRalexCategoryName(params.categoryNode.name), locale);
  const defaults = categorySeoDefaults(slug);
  const copy = categoryCopyForSlug(slug, locale);
  const count = params.productsInCategory.length;
  const topic = categoryTopicPhrase(slug, displayName, locale);
  const productLinks = pickProductLinks(params.productsInCategory);
  const relatedCategoryLinks = pickRelatedCategories(params.categoryNode, params.categoryTree, locale);

  const countLabel =
    locale === "en"
      ? count > 0
        ? `${count} products`
        : "our current range"
      : count > 0
        ? `${count} producten`
        : "actueel assortiment";

  const autoIntro =
    locale === "en"
      ? `Discover ${countLabel} in the ${displayName} category at ${SITE_BRAND_SHORT}. ` +
        `Here you’ll find ${topic}, with personal advice from Dedemsvaart and delivery across the Netherlands and Belgium.`
      : `Ontdek ${countLabel} in de categorie ${displayName} bij ${SITE_BRAND_SHORT}. ` +
        `Je vindt hier ${topic}, met persoonlijk advies uit Dedemsvaart en levering in Nederland en België.`;

  const intro = params.customIntro?.trim() || copy?.intro || autoIntro;

  const autoDescription = copy?.seoDescription ?? defaults?.seoDescription ?? intro;
  const metaDescription =
    autoDescription.length > 155 ? `${autoDescription.slice(0, 152).trim()}…` : autoDescription;

  const isLafuga = /lafuga/i.test(slug);
  const footerTitle =
    isLafuga && locale === "nl"
      ? LAFUGA_HEADING
      : locale === "en"
        ? `${displayName} – online at ${SITE_BRAND_SHORT}`
        : `${displayName} – online bij ${SITE_BRAND_SHORT}`;

  // Alleen LaFuga mag rijke HTML-footer; elders curated body (voorkomt dubbele + EN Woo-teksten).
  const customFooter =
    isLafuga && params.customFooterHtml?.trim() ? params.customFooterHtml.trim() : null;
  const curatedBody = copy?.body?.filter((p) => p.trim()) ?? [];

  const footerParagraphs = customFooter
    ? []
    : curatedBody.length > 0
      ? curatedBody
      : locale === "en"
        ? [
            `At ${SITE_BRAND_SHORT} you’ll find ${topic} with personal advice from Dedemsvaart.`,
            `Compare models online or visit the shop. Secure checkout with iDEAL, Apple Pay or card.`,
          ]
        : [
            `Bij ${SITE_BRAND_SHORT} vind je ${topic} met persoonlijk advies vanuit Dedemsvaart.`,
            `Vergelijk online of kom langs in de zaak. Veilig betalen met iDEAL, Apple Pay of creditcard.`,
          ];

  return {
    intro,
    metaDescription,
    footerTitle,
    footerParagraphs,
    productLinks,
    relatedCategoryLinks,
    customFooterHtml: customFooter,
  };
}

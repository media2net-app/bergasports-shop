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
  const hasOfficialFooter = Boolean(params.customFooterHtml?.trim()) && isLafuga;

  const footerParagraphs = hasOfficialFooter
    ? []
    : locale === "en"
      ? [
          `At ${SITE_BRAND_SHORT} the ${displayName} category offers a selection of ${topic} for serious cyclists and athletes. ` +
            `Compare models, sizes and specs on the site — from road bikes to wheels, shoes and accessories.`,
          `Ordering is simple: add products to your cart, enter your delivery details and pay securely with iDEAL, Apple Pay or card. ` +
            `Check the product description for size, materials and technical details before you order.`,
          count > 0
            ? `This category currently lists ${count} items in the webshop. ` +
              `Use the colour and size filters on the left to find the right variant quickly.`
            : `The range in this category is updated regularly. Check back later or browse other categories in the shop.`,
          `Questions about availability or delivery? Contact us via the contact page. ` +
            `${SITE_BRAND_SHORT} is here with personal advice and a secure online shopping experience.`,
        ]
      : [
          `Bij ${SITE_BRAND_SHORT} vind je in de categorie ${displayName} een selectie ${topic} voor serieuze fietsers en atleten. ` +
            `Vergelijk modellen, maten en specificaties direct op de site — van racefiets tot wielen, schoenen en accessoires.`,
          `Bestellen is eenvoudig: voeg producten toe aan je winkelwagen, vul je bezorggegevens in en betaal veilig met iDEAL, Apple Pay of creditcard. ` +
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

/**
 * Photo-consistency rules for Bergasports catalog images (ChatGPT / OpenAI edits).
 * Map shop categories → camera angle, background, framing. Easy to extend.
 */

import { toCanonicalWcSlug } from "@/lib/category-slugs";

export type ProductImageNormalizeFamily =
  | "bikes"
  | "shoes"
  | "apparel"
  | "accessories"
  | "wheels"
  | "skates"
  | "default";

export type ProductImageNormalizeRule = {
  family: ProductImageNormalizeFamily;
  label: string;
  /** Camera / product orientation */
  angle: string;
  /** Studio background */
  background: string;
  /** Framing / crop / product size in frame */
  framing: string;
  /** Extra category-specific notes */
  details: string;
};

/** Shared studio defaults — keep identical across families unless overridden. */
const STUDIO_BG =
  "seamless light neutral studio backdrop (soft off-white / light grey #F2F2F0), even softbox lighting, no props, no floor shadows that look outdoor, no lifestyle scene";

const SQUARE_FRAME =
  "square 1:1 composition, product centered, subject fills roughly 70–80% of the frame, consistent margins on all sides, no tilted crop";

/**
 * Canonical WC category slug (or alias) → family.
 * Add new slugs here when categories grow.
 */
const SLUG_TO_FAMILY: Record<string, ProductImageNormalizeFamily> = {
  bikes: "bikes",
  "road-bike": "bikes",
  gravelbike: "bikes",
  "gravel-bike": "bikes",
  mtb: "bikes",
  "used-bikes": "bikes",
  fietsen: "bikes",
  racefietsen: "bikes",
  gravel: "bikes",
  tweedehands: "bikes",

  "cycling-shoes": "shoes",
  wielrenschoenen: "shoes",
  "schoenen-kleding": "shoes",
  cleats: "shoes",
  schoenplaatjes: "shoes",

  "lafuga-wear": "apparel",
  "lafuga-kleding": "apparel",
  clothing: "apparel",

  accessories: "accessories",
  accessoires: "accessories",
  glasses: "accessories",
  brillen: "accessories",
  "cycling-helmets": "accessories",
  helmen: "accessories",
  "group-sets": "accessories",
  groepsets: "accessories",

  wheels: "wheels",
  wielen: "wheels",
  "scope-outlet": "wheels",

  "speed-skates": "skates",
  skeelers: "skates",
};

export const PRODUCT_IMAGE_NORMALIZE_RULES: Record<ProductImageNormalizeFamily, ProductImageNormalizeRule> = {
  bikes: {
    family: "bikes",
    label: "Fietsen",
    angle:
      "drive-side 3/4 view: bike standing upright, front wheel slightly turned toward camera, camera at mid-frame height looking slightly down",
    background: STUDIO_BG,
    framing: SQUARE_FRAME,
    details:
      "keep full bike visible including wheels and drivetrain; preserve geometry, paint, logos, groupset branding and cable routing exactly",
  },
  shoes: {
    family: "shoes",
    label: "Schoenen",
    angle:
      "3/4 front-outer view of a single shoe (or matched pair side-by-side if source shows a pair), slight heel elevation, camera roughly at shoe mid-height",
    background: STUDIO_BG,
    framing: SQUARE_FRAME,
    details:
      "preserve sole pattern, cleat mounts, vents, stitching, colors and brand marks exactly; no foot or model",
  },
  apparel: {
    family: "apparel",
    label: "Kleding",
    angle:
      "front-facing product view on invisible form / flat-lay style as appropriate to the garment; shoulders square to camera, no twisted drape",
    background: STUDIO_BG,
    framing: SQUARE_FRAME,
    details:
      "preserve fabric texture, logos, seams, zippers and colorways exactly; no model face or lifestyle background",
  },
  accessories: {
    family: "accessories",
    label: "Accessoires",
    angle:
      "straight-on or gentle 3/4 product view, product resting stably, camera level with the product center",
    background: STUDIO_BG,
    framing: SQUARE_FRAME,
    details: "preserve shape, materials, logos and small hardware details exactly",
  },
  wheels: {
    family: "wheels",
    label: "Wielen",
    angle:
      "wheelset or wheel at a slight 3/4 angle showing rim depth and spokes; hub facing slightly toward camera",
    background: STUDIO_BG,
    framing: SQUARE_FRAME,
    details: "preserve rim profile, spoke pattern, hub logos and tire graphics exactly",
  },
  skates: {
    family: "skates",
    label: "Skeelers",
    angle:
      "3/4 side view of the skate/frame, wheels visible in a line, camera at mid-boot height",
    background: STUDIO_BG,
    framing: SQUARE_FRAME,
    details: "preserve boot, frame, wheels, bearings and brand marks exactly",
  },
  default: {
    family: "default",
    label: "Algemeen",
    angle: "clean catalog 3/4 product view, camera level with product center",
    background: STUDIO_BG,
    framing: SQUARE_FRAME,
    details: "preserve all product colors, logos, materials and geometry exactly",
  },
};

function slugifyLoose(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function familyFromSlug(slug: string): ProductImageNormalizeFamily | null {
  const raw = slug.trim().toLowerCase();
  if (!raw) return null;
  const canonical = toCanonicalWcSlug(raw);
  return SLUG_TO_FAMILY[raw] ?? SLUG_TO_FAMILY[canonical] ?? null;
}

function familyFromHaystack(hay: string): ProductImageNormalizeFamily | null {
  const h = hay.toLowerCase();
  if (/skeeler|speed.?skate|inline.?skate|schaats/.test(h)) return "skates";
  if (/wiel(?!ren)|wheel|velg|rimset|scope/.test(h)) return "wheels";
  if (/schoen|shoe|cleat|plaatje|nimbl/.test(h)) return "shoes";
  if (/lafuga|jersey|broek|jacket|kleding|apparel|clothing|wear/.test(h)) return "apparel";
  if (/helm|helmet|bril|glass|groepset|group.?set|accessoire|accessory/.test(h)) return "accessories";
  if (/fiets|bike|racefiets|gravel|mtb|colnago|orbea|cervelo|basso/.test(h)) return "bikes";
  return null;
}

export type ProductImageNormalizeMatchInput = {
  category?: string | null;
  name?: string | null;
  wcCategories?: { slug?: string; name?: string }[] | null;
};

/** Resolve which consistency rule applies to a product. */
export function resolveProductImageNormalizeRule(
  product: ProductImageNormalizeMatchInput,
): ProductImageNormalizeRule {
  for (const wc of product.wcCategories ?? []) {
    const fromSlug = familyFromSlug(wc.slug ?? "");
    if (fromSlug) return PRODUCT_IMAGE_NORMALIZE_RULES[fromSlug];
  }

  const cat = product.category?.trim() ?? "";
  if (cat) {
    const fromSlug = familyFromSlug(cat) ?? familyFromSlug(slugifyLoose(cat));
    if (fromSlug) return PRODUCT_IMAGE_NORMALIZE_RULES[fromSlug];
    const fromLabel = familyFromHaystack(cat);
    if (fromLabel) return PRODUCT_IMAGE_NORMALIZE_RULES[fromLabel];
  }

  const fromName = familyFromHaystack(product.name ?? "");
  if (fromName) return PRODUCT_IMAGE_NORMALIZE_RULES[fromName];

  return PRODUCT_IMAGE_NORMALIZE_RULES.default;
}

/** Full edit prompt sent to OpenAI images/edits. */
export function buildProductImageNormalizePrompt(input: {
  productName: string;
  rule: ProductImageNormalizeRule;
}): string {
  const name = input.productName.slice(0, 200);
  const { rule } = input;

  return (
    `E-commerce studio photo consistency edit for Bergasports. ` +
    `The input image is the real product "${name}" (category style: ${rule.label}). ` +
    `Rewrite the photo so it matches our catalog standard while keeping the EXACT same physical product.\n\n` +
    `CAMERA ANGLE: ${rule.angle}.\n` +
    `BACKGROUND: ${rule.background}.\n` +
    `FRAMING / DIMENSIONS IN PHOTO: ${rule.framing}. Output must be a clean square catalog image.\n` +
    `DETAILS TO PRESERVE: ${rule.details}. ` +
    `Do not invent features, change colors, alter logos, warp proportions, or replace the product with a lookalike. ` +
    `Remove clutter, busy backgrounds, reflections that hide the product, and inconsistent crops. ` +
    `Photorealistic, sharp, commercial product photography only — no text overlays, no watermarks, no people.`
  );
}

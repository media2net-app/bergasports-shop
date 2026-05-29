import type { TrendyolJsonProduct } from "@/lib/products";

/** Overlay field values — always from product when possible; no template cm fallback. */
export type AiImageOverlayValues = {
  setQuantity: number | null;
  productTitleRo: string;
  widthCm: number | null;
  heightCm: number | null;
  thicknessCm: number | null;
  /** Sizes / combined spec line for overlay (e.g. XL · XXL or 180×200 cm) */
  dimensionLine: string;
  sizeOptions: string[];
};

export type AiImageIncludeFlags = {
  setQuantity: boolean;
  productTitle: boolean;
  dimensions: boolean;
  madeInRomania: boolean;
  catalogExtras: boolean;
};

export const DEFAULT_AI_INCLUDE_FLAGS: AiImageIncludeFlags = {
  setQuantity: true,
  productTitle: true,
  dimensions: true,
  madeInRomania: true,
  catalogExtras: false,
};

export type ParsedAiProductOverlay = AiImageOverlayValues & {
  overlayExtraText?: string;
  parseNotes: string[];
};

export function emptyAiImageOverlayValues(): AiImageOverlayValues {
  return {
    setQuantity: null,
    productTitleRo: "",
    widthCm: null,
    heightCm: null,
    thicknessCm: null,
    dimensionLine: "",
    sizeOptions: [],
  };
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function combinedText(product: Pick<TrendyolJsonProduct, "name" | "category" | "wcShortDescriptionHtml" | "wcDescriptionHtml" | "wcVariations">): string {
  const parts = [
    product.name,
    product.category ?? "",
    stripHtml(product.wcShortDescriptionHtml ?? ""),
    stripHtml(product.wcDescriptionHtml ?? ""),
  ];
  if (product.wcVariations?.length) {
    for (const v of product.wcVariations) {
      if (v.label) parts.push(v.label);
    }
  }
  return parts.filter(Boolean).join(" ");
}

function parseSetQuantity(text: string): number | null {
  const patterns = [/\bset\s*(\d+)\b/i, /\bset\s+de\s+(\d+)\b/i, /\b(\d+)\s*(?:buc|bucăți|bucati)\b/i];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const n = Number(m[1]);
      if (n >= 1 && n <= 99) return n;
    }
  }
  return null;
}

function parseCmDimensions(text: string): {
  widthCm: number | null;
  heightCm: number | null;
  thicknessCm: number | null;
} {
  const m3 = text.match(/(\d{2,3})\s*[x×]\s*(\d{2,3})\s*[x×]\s*(\d{1,2})\s*cm?/i);
  if (m3) {
    return {
      widthCm: Number(m3[1]),
      heightCm: Number(m3[2]),
      thicknessCm: Number(m3[3]),
    };
  }
  const m2 = text.match(/(\d{2,3})\s*[x×]\s*(\d{2,3})\s*cm?/i);
  if (m2) {
    return { widthCm: Number(m2[1]), heightCm: Number(m2[2]), thicknessCm: null };
  }
  const thick = text.match(/(?:grosime|înălțime|inaltime|gros|espesor)\s*[:\s]*(\d{1,2})\s*cm/i);
  if (thick) {
    return { widthCm: null, heightCm: null, thicknessCm: Number(thick[1]) };
  }
  return { widthCm: null, heightCm: null, thicknessCm: null };
}

const SIZE_TOKEN =
  /\b(XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|UNIVERSAL|UNIVERSALĂ)\b|(?:[Mm]arime|Size|Talie)\s*:\s*([A-Za-z0-9][A-Za-z0-9\s/\-–]{0,20})/gi;

function parseSizeOptionsFromVariations(
  variations: TrendyolJsonProduct["wcVariations"],
  fullText: string,
): string[] {
  const found = new Set<string>();

  for (const v of variations ?? []) {
    const label = v.label?.trim();
    if (!label) continue;

    let m: RegExpExecArray | null;
    SIZE_TOKEN.lastIndex = 0;
    while ((m = SIZE_TOKEN.exec(label)) !== null) {
      const token = (m[1] ?? m[2])?.trim();
      if (token && token.length <= 24) {
        found.add(token.toUpperCase());
      }
    }

    const dimInLabel = label.match(/(\d{2,3}\s*[x×]\s*\d{2,3}\s*cm?)/i);
    if (dimInLabel) {
      found.add(dimInLabel[1].replace(/\s+/g, " "));
    }
  }

  if (found.size === 0) {
    let m: RegExpExecArray | null;
    SIZE_TOKEN.lastIndex = 0;
    while ((m = SIZE_TOKEN.exec(fullText)) !== null) {
      const token = (m[1] ?? m[2])?.trim();
      if (token && token.length <= 24) {
        found.add(token.toUpperCase());
      }
    }
  }

  return [...found];
}

function deriveProductTitle(name: string, category: string): string {
  let cleaned = name
    .replace(/\bset\s*\d+\b/gi, "")
    .replace(/\d+\s*[x×]\s*\d+[^,|]*/gi, "")
    .replace(/[Mm]arime:\s*[^,|]+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) {
    cleaned = (category ?? "").trim();
  }
  if (!cleaned) return "";
  return cleaned.length <= 48 ? cleaned.toUpperCase() : cleaned.slice(0, 48).toUpperCase();
}

export function buildDimensionLine(values: AiImageOverlayValues): string {
  if (values.dimensionLine.trim()) {
    return values.dimensionLine.trim();
  }
  if (values.widthCm != null && values.heightCm != null) {
    const base = `${values.widthCm} × ${values.heightCm} cm`;
    if (values.thicknessCm != null) {
      return `${base} · ↕ ${values.thicknessCm} cm`;
    }
    return base;
  }
  if (values.sizeOptions.length) {
    return values.sizeOptions.join(" · ");
  }
  if (values.thicknessCm != null) {
    return `↕ ${values.thicknessCm} cm`;
  }
  return "";
}

/** Parse overlay fields from catalog product (name, descriptions, WC variations). */
export function parseProductAiImageOverlay(
  product: Pick<
    TrendyolJsonProduct,
    "name" | "category" | "wcShortDescriptionHtml" | "wcDescriptionHtml" | "wcVariations"
  >,
): ParsedAiProductOverlay {
  const text = combinedText(product);
  const notes: string[] = [];

  const setQuantity = parseSetQuantity(text);
  const cm = parseCmDimensions(text);
  const sizeOptions = parseSizeOptionsFromVariations(product.wcVariations, text);
  const productTitleRo = deriveProductTitle(product.name, product.category ?? "");

  let dimensionLine = "";
  if (cm.widthCm != null && cm.heightCm != null) {
    dimensionLine = buildDimensionLine({
      ...emptyAiImageOverlayValues(),
      widthCm: cm.widthCm,
      heightCm: cm.heightCm,
      thicknessCm: cm.thicknessCm,
    });
    notes.push(`Dimensions ${dimensionLine}`);
  } else if (sizeOptions.length) {
    dimensionLine = sizeOptions.join(" · ");
    notes.push(`Sizes: ${dimensionLine}`);
  } else if (cm.thicknessCm != null) {
    dimensionLine = `↕ ${cm.thicknessCm} cm`;
    notes.push(dimensionLine);
  }

  if (setQuantity != null) notes.push(`SET ${setQuantity}`);
  if (productTitleRo) notes.push(`Title: ${productTitleRo}`);
  if (product.wcVariations?.length) {
    notes.push(`${product.wcVariations.length} variation(s)`);
  }

  const short = stripHtml(product.wcShortDescriptionHtml ?? "").slice(0, 160);
  const overlayExtraText = short.length > 8 ? short : undefined;

  return {
    setQuantity,
    productTitleRo,
    widthCm: cm.widthCm,
    heightCm: cm.heightCm,
    thicknessCm: cm.thicknessCm,
    dimensionLine,
    sizeOptions,
    overlayExtraText,
    parseNotes: notes,
  };
}

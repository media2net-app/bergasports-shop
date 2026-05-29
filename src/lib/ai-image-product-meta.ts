import type { AiImageOverlayValues, ParsedAiProductOverlay } from "@/lib/ai-image-overlay";
import { emptyAiImageOverlayValues, parseProductAiImageOverlay } from "@/lib/ai-image-overlay";
import type { TrendyolJsonProduct } from "@/lib/products";

/** @deprecated Use parseProductAiImageOverlay */
export type ParsedAiProductMeta = ParsedAiProductOverlay;

export { parseProductAiImageOverlay, emptyAiImageOverlayValues };
export type { AiImageOverlayValues, ParsedAiProductOverlay };

/** Legacy merge — only fills missing fields from template (avoid for dimensions). */
export function mergeParsedIntoTemplateDefaults(
  templateDefaults: {
    setQuantity: number;
    productTitleRo: string;
    widthCm: number;
    heightCm: number;
    thicknessCm: number;
  },
  parsed: ParsedAiProductOverlay,
): AiImageOverlayValues {
  return {
    setQuantity: parsed.setQuantity ?? null,
    productTitleRo: parsed.productTitleRo || templateDefaults.productTitleRo,
    widthCm: parsed.widthCm,
    heightCm: parsed.heightCm,
    thicknessCm: parsed.thicknessCm,
    dimensionLine: parsed.dimensionLine,
    sizeOptions: parsed.sizeOptions,
  };
}

export function parseProductAiImageMeta(
  product: Pick<TrendyolJsonProduct, "name" | "category" | "wcShortDescriptionHtml" | "wcDescriptionHtml" | "wcVariations">,
  options?: { shopCategoryLabel?: string },
): ParsedAiProductOverlay {
  const parsed = parseProductAiImageOverlay(product);
  if (options?.shopCategoryLabel && !parsed.productTitleRo) {
    return {
      ...parsed,
      productTitleRo: options.shopCategoryLabel.trim().toUpperCase(),
    };
  }
  return parsed;
}

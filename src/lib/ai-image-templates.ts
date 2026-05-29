/**
 * AI product image templates — one style per category.
 * Used on /admin/ai-images to preview overlays and build generation prompts.
 */

import type { AiImageIncludeFlags, AiImageOverlayValues } from "@/lib/ai-image-overlay";
import { buildDimensionLine } from "@/lib/ai-image-overlay";

export type AiTemplateOverlayElement = {
  id: string;
  label: string;
  description: string;
  /** Placeholder token for future prompt / compositor */
  token: string;
  example?: string;
};

export type AiImageCategoryTemplate = {
  id: string;
  name: string;
  description: string;
  referenceImageUrl: string;
  /** Example values shown in the UI (user can change per product later) */
  defaults: {
    setQuantity: number;
    productTitleRo: string;
    widthCm: number;
    heightCm: number;
    thicknessCm: number;
  };
  overlayElements: AiTemplateOverlayElement[];
  styleNotes: string[];
  /** Legacy; use buildPromptFromTemplate */
  promptTemplate: string;
  /** Short scene description for the reference template */
  sceneHints?: string;
};

export type AiImagePromptContext = {
  overlay: AiImageOverlayValues;
  include?: Partial<AiImageIncludeFlags>;
  referenceImageUrl: string;
  sourceImageUrl?: string | null;
  sourceProductName?: string;
  overlayExtraText?: string;
};

export const AI_IMAGE_TEMPLATES: AiImageCategoryTemplate[] = [
  {
    id: "set-lifestyle-ro-overlay",
    name: "SET lifestyle + overlay RO",
    description:
      "Outdoor lifestyle on balcony/terrace with product in use, warm sunlight. Top-right white panel with SET count, title, dimensions, and Made in Romania.",
    referenceImageUrl: "/admin/ai-templates/pillow-set4-reference.png",
    defaults: {
      setQuantity: 4,
      productTitleRo: "PERNUȚE SCAUN",
      widthCm: 40,
      heightCm: 40,
      thicknessCm: 7,
    },
    overlayElements: [
      {
        id: "set-quantity",
        label: "SET quantity",
        description: "Large headline top-left in the white panel, e.g. SET 4",
        token: "{{set_quantity}}",
        example: "SET 4",
      },
      {
        id: "product-title",
        label: "Product title",
        description: "Uppercase subtitle under SET, e.g. PERNUȚE SCAUN",
        token: "{{product_title_ro}}",
        example: "PERNUȚE SCAUN",
      },
      {
        id: "dimensions-plan",
        label: "Dimensions (plan)",
        description: "Line drawing top view with width and height in cm",
        token: "{{width_cm}}×{{height_cm}}",
        example: "40 cm × 40 cm",
      },
      {
        id: "dimensions-side",
        label: "Dimensions (side)",
        description: "Side view with arrow and thickness in cm",
        token: "{{thickness_cm}}",
        example: "↕ 7 cm",
      },
      {
        id: "made-in-ro",
        label: "Made in Romania",
        description: "Romania outline, FABRICAT ÎN ROMÂNIA text, and flag",
        token: "fabricat_in_romania",
        example: "FABRICAT ÎN ROMÂNIA",
      },
    ],
    styleNotes: [
      "Outdoor lifestyle: houten tafel en stoelen, warm middag-/avondlicht",
      "Producten in diep bordeaux/maroons met knopen (getuft)",
      "Semi-transparant wit overlay-paneel rechtsboven (~35% breedte)",
      "Typografie: donker wijnrood/bordeaux, strak sans-serif, SET extra groot",
      "Decoratieve lijntekeningen voor afmetingen (niet foto)",
    ],
    /** Assembled by buildPromptFromTemplate — kept for category-specific scene hints. */
    promptTemplate: "",
    sceneHints:
      "Reference scene: outdoor balcony, wooden table/chairs, warm sunlight, white overlay panel top-right with burgundy typography and dimension line drawings.",
  },
];

export function getAiImageTemplateById(id: string): AiImageCategoryTemplate | undefined {
  return AI_IMAGE_TEMPLATES.find((t) => t.id === id);
}

export function buildPromptFromTemplate(
  template: AiImageCategoryTemplate,
  context: AiImagePromptContext,
): string {
  const o = context.overlay;
  const inc = {
    setQuantity: context.include?.setQuantity !== false,
    productTitle: context.include?.productTitle !== false,
    dimensions: context.include?.dimensions !== false,
    madeInRomania: context.include?.madeInRomania !== false,
    catalogExtras: context.include?.catalogExtras === true,
  };

  const ref = context.referenceImageUrl || template.referenceImageUrl;
  const source = context.sourceImageUrl?.trim();
  const scene = template.sceneHints ?? template.description;
  const dimDisplay = buildDimensionLine(o);
  const setCount = o.setQuantity ?? 1;

  const sourceBlock = source
    ? `2) SOURCE PRODUCT PHOTO: ${source}
   Use ONLY the product appearance from this image (exact colors, fabric, pattern, texture). Match product count to reference or SET count when applicable.`
    : `2) SOURCE PRODUCT PHOTO: (attached separately)
   Use ONLY the product appearance from the uploaded source.`;

  const overlayLines: string[] = [];
  if (inc.setQuantity && o.setQuantity != null) {
    overlayLines.push(`   • "SET ${o.setQuantity}"`);
  }
  if (inc.productTitle && o.productTitleRo.trim()) {
    overlayLines.push(`   • "${o.productTitleRo.trim()}"`);
  }
  if (inc.dimensions && dimDisplay) {
    if (o.widthCm != null && o.heightCm != null) {
      overlayLines.push(
        `   • Dimension line art: top view ${o.widthCm} cm × ${o.heightCm} cm${o.thicknessCm != null ? `; side thickness ${o.thicknessCm} cm` : ""}`,
      );
    } else {
      overlayLines.push(`   • Sizes/specs on overlay: "${dimDisplay}" (use line art or text matching reference style)`);
    }
  }
  if (inc.madeInRomania) {
    overlayLines.push(`   • "FABRICAT ÎN ROMÂNIA" + Romania map outline + Romanian flag`);
  }
  if (inc.catalogExtras && context.overlayExtraText?.trim()) {
    overlayLines.push(`   • Extra catalog line: "${context.overlayExtraText.trim()}"`);
  }

  const overlayBlock =
    overlayLines.length > 0
      ? `B) OVERLAY TEXT ONLY — update labels (same positions, fonts, colors as reference):\n${overlayLines.join("\n")}`
      : "B) Keep overlay panel layout but omit text not listed above.";

  let productLine = context.sourceProductName?.trim()
    ? `\nCatalog product: ${context.sourceProductName.trim()}`
    : "";
  if (o.sizeOptions.length) {
    productLine += `\nVariations/sizes: ${o.sizeOptions.join(", ")}`;
  }

  return `CRITICAL — IN-PLACE EDIT OF REFERENCE TEMPLATE (NOT A NEW PHOTO)

You receive two images:
1) REFERENCE TEMPLATE (fixed master): ${ref}
   ${scene}
   Master layout: camera, scene, furniture, overlay panel position/size/fonts/icons unchanged.

${sourceBlock}

TASK — OUTPUT MUST MATCH REFERENCE EXCEPT:
A) PRODUCT SWAP ONLY: Replace products with SOURCE look. Do not change scene or props.
${overlayBlock}

FORBIDDEN: new background, moved overlay panel, English text, watermarks.${productLine}

Result: pixel-faithful reference with source product and updated overlay (${setCount} unit(s) where SET applies).`;
}

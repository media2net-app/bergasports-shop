import LocalizedLink from "@/components/locale/LocalizedLink";

import { productPath } from "@/lib/product-slug";
import type { Product } from "@/lib/products";
import { shortVariationLabel, sortVariationsForDisplay } from "@/lib/wc-variations";

type Props = {
  product: Product;
};

/** Variant chips wrap (geen horizontale page-scroll). */
export default function ShopProductCardVariationChips({ product }: Props) {
  const variations = sortVariationsForDisplay(product.wcVariations);
  if (!variations || variations.length <= 1) {
    return null;
  }

  const baseHref = productPath(product);

  return (
    <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Varianten">
      {variations.map((v) => (
        <LocalizedLink
          key={v.id}
          href={`${baseHref}?variation=${v.id}`}
          scroll
          className="rounded-full border border-[#e5dcc8] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--foreground)] transition hover:border-[#B38F27]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B38F27] focus-visible:ring-offset-1"
        >
          {shortVariationLabel(v.label)}
        </LocalizedLink>
      ))}
    </div>
  );
}

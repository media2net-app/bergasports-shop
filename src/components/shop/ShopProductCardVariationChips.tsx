import Link from "next/link";

import { productPath } from "@/lib/product-slug";
import type { Product } from "@/lib/products";
import { shortVariationLabel, sortVariationsForDisplay } from "@/lib/wc-variations";

type Props = {
  product: Product;
};

export default function ShopProductCardVariationChips({ product }: Props) {
  const variations = sortVariationsForDisplay(product.wcVariations);
  if (!variations || variations.length <= 1) {
    return null;
  }

  const baseHref = productPath(product);

  return (
    <div
      className="shop-variation-scroll mt-2 -mx-1 flex flex-nowrap gap-1.5 overflow-x-auto px-1 pb-1.5"
      aria-label="Variante produs"
    >
      {variations.map((v) => (
        <Link
          key={v.id}
          href={`${baseHref}?variation=${v.id}`}
          scroll
          className="shrink-0 rounded-full border border-[#e5dcc8] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--foreground)] transition hover:border-[#B38F27]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B38F27] focus-visible:ring-offset-1"
        >
          {shortVariationLabel(v.label)}
        </Link>
      ))}
    </div>
  );
}

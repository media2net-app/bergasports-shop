"use client";

import { useProductVariation } from "@/components/product/ProductVariationContext";
import { useShopLocale } from "@/components/locale/ShopLanguagesProvider";
import { ui } from "@/lib/i18n/ui";
import {
  formatProductCardPrice,
  formatProductPrice,
  type Product,
} from "@/lib/products";

type Props = {
  product: Product;
};

/**
 * Eén prijs op de PDP, die meebeweegt met de gekozen variant.
 * Bij meerdere varianten zonder keuze tonen we de prijsrange.
 */
export default function ProductPriceBlock({ product }: Props) {
  const { locale } = useShopLocale();
  const t = ui(locale);
  const ctx = useProductVariation();
  const variations = ctx?.variations;
  const selected = ctx?.selected;

  const singleVariation = variations?.length === 1 ? variations[0] : undefined;
  const activeUnit = singleVariation?.price ?? selected?.price;
  const isRange = Boolean(variations && variations.length > 1 && !selected);

  const priceLabel = isRange
    ? formatProductCardPrice(product)
    : formatProductPrice(activeUnit ?? product.price, product.currency);

  /* Doorgestreepte prijs alleen bij een vaste prijs — anders vergelijk je appels met peren. */
  const showOldPrice = !isRange && !activeUnit && Boolean(product.oldPrice);
  const saving =
    showOldPrice && product.oldPrice ? product.oldPrice - product.price : 0;

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {isRange ? (
          <span className="text-sm font-semibold text-[var(--foreground)]/60">{t.fromPrice}</span>
        ) : null}
        <span className="text-3xl font-bold tracking-tight text-[var(--foreground)] md:text-4xl">
          {priceLabel}
        </span>
        {showOldPrice && product.oldPrice ? (
          <span className="text-lg text-[var(--foreground)]/45 line-through">
            {formatProductPrice(product.oldPrice, product.currency)}
          </span>
        ) : null}
        {saving > 0.005 ? (
          <span className="rounded-full bg-[#166534] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            {t.youSave(formatProductPrice(saving, product.currency))}
          </span>
        ) : null}
      </div>
      <p className="mt-1.5 text-xs text-[var(--foreground)]/60">
        {isRange ? t.inclVatRange : t.inclVat}
      </p>
    </div>
  );
}

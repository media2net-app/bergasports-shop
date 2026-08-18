"use client";

import LocalizedLink from "@/components/locale/LocalizedLink";

import type { ShopMerchView } from "@/lib/shop-merchandising-views";
import { shopMerchViewLabel } from "@/lib/shop-merchandising-views";
import { SHOP_SORT_OPTIONS, type ShopSort } from "@/lib/shop-sort";
import {
  buildShopListingUrl,
  shopBrandFacetLabel,
  shopColorFacetLabel,
  shopSizeFacetLabel,
  shopSpecFacetLabel,
  type ShopSpecFacetGroup,
} from "@/lib/shop-category-filter";

type Props = {
  categorySlug: string | null;
  selectedColors: string[];
  selectedSizes: string[];
  selectedBrands: string[];
  selectedSpecs: string[];
  searchQuery: string | null;
  sort: ShopSort;
  merchView: ShopMerchView | null;
  categoryLabel: string | null;
  colorLabels: { id: string; label: string }[];
  sizeLabels: { id: string; label: string }[];
  brandLabels: { id: string; label: string }[];
  specGroups: ShopSpecFacetGroup[];
};

export default function ShopToolbar({
  categorySlug,
  selectedColors,
  selectedSizes,
  selectedBrands,
  selectedSpecs,
  searchQuery,
  sort,
  merchView,
  categoryLabel,
  colorLabels,
  sizeLabels,
  brandLabels,
  specGroups,
}: Props) {
  const baseQuery = {
    cat: categorySlug,
    page: 1,
    colors: selectedColors,
    sizes: selectedSizes,
    brands: selectedBrands,
    specs: selectedSpecs,
    search: searchQuery,
    sort,
    view: merchView,
  };

  const clearAllHref = buildShopListingUrl({
    cat: null,
    page: 1,
    colors: [],
    sizes: [],
    brands: [],
    specs: [],
    search: null,
    sort,
    view: null,
  });

  const chips: { key: string; label: string; href: string }[] = [];

  if (categoryLabel && categorySlug) {
    chips.push({
      key: "cat",
      label: categoryLabel,
      href: buildShopListingUrl({ ...baseQuery, cat: null }),
    });
  }
  for (const id of selectedColors) {
    const label = colorLabels.find((c) => c.id === id)?.label ?? shopColorFacetLabel(id);
    chips.push({
      key: `c-${id}`,
      label,
      href: buildShopListingUrl({
        ...baseQuery,
        colors: selectedColors.filter((x) => x !== id),
      }),
    });
  }
  for (const id of selectedSizes) {
    const label = sizeLabels.find((s) => s.id === id)?.label ?? shopSizeFacetLabel(id);
    chips.push({
      key: `s-${id}`,
      label,
      href: buildShopListingUrl({
        ...baseQuery,
        sizes: selectedSizes.filter((x) => x !== id),
      }),
    });
  }
  for (const id of selectedBrands) {
    chips.push({
      key: `b-${id}`,
      label: shopBrandFacetLabel(id, brandLabels),
      href: buildShopListingUrl({
        ...baseQuery,
        brands: selectedBrands.filter((x) => x !== id),
      }),
    });
  }
  for (const id of selectedSpecs) {
    chips.push({
      key: `e-${id}`,
      label: shopSpecFacetLabel(id, specGroups),
      href: buildShopListingUrl({
        ...baseQuery,
        specs: selectedSpecs.filter((x) => x !== id),
      }),
    });
  }
  if (searchQuery) {
    chips.push({
      key: "q",
      label: `„${searchQuery}”`,
      href: buildShopListingUrl({ ...baseQuery, search: null }),
    });
  }
  if (merchView) {
    chips.push({
      key: "view",
      label: shopMerchViewLabel(merchView),
      href: buildShopListingUrl({ ...baseQuery, view: null }),
    });
  }

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <LocalizedLink
              key={chip.key}
              href={chip.href}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#e5dcc8] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--foreground)] transition hover:border-[#B38F27]/30"
            >
              <span className="truncate">{chip.label}</span>
              <span aria-hidden className="text-[var(--foreground)]/50">
                ×
              </span>
            </LocalizedLink>
          ))}
          <LocalizedLink
            href={clearAllHref}
            className="text-xs font-semibold text-[#96741f] underline underline-offset-2"
          >
            Wis alle filters
          </LocalizedLink>
        </div>
      ) : (
        <span className="text-sm text-[var(--foreground)]/65">Geen actieve filters</span>
      )}

      <label className="flex shrink-0 items-center gap-2 text-sm text-[var(--foreground)]">
        <span className="font-medium">Sorteren</span>
        <select
          className="rounded-lg border border-[#e5dcc8] bg-white px-2.5 py-1.5 text-sm font-semibold text-[var(--foreground)] outline-none focus:border-[#B38F27]"
          value={sort}
          onChange={(e) => {
            const next = e.target.value as ShopSort;
            window.location.href = buildShopListingUrl({ ...baseQuery, sort: next });
          }}
        >
          {SHOP_SORT_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

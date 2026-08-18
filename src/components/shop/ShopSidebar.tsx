"use client";

import LocalizedLink from "@/components/locale/LocalizedLink";
import { useState } from "react";
import { useCategories } from "@/components/categories/CategoriesProvider";
import { flattenRalexCategoryTree, formatRalexCategoryName } from "@/lib/ralex-categories";
import type { ShopMerchView } from "@/lib/shop-merchandising-views";
import {
  buildShopListingUrl,
  type ShopFacetChip,
  type ShopListingSort,
} from "@/lib/shop-category-filter";

const CATEGORY_PREVIEW_COUNT = 5;

type ShopSidebarProps = {
  activeCategorySlug: string | null;
  selectedColors: string[];
  selectedSizes: string[];
  colorFacets: ShopFacetChip[];
  sizeFacets: ShopFacetChip[];
  /** Zoekterm uit `?q=` — behouden bij navigatie in sidebar. */
  searchQuery?: string | null;
  sort?: ShopListingSort;
  merchView?: ShopMerchView | null;
  /** Bij URL `cat` onbekend: toon geen facet-filters. */
  hideFacets?: boolean;
};

function toggle<T extends string>(list: T[], id: T): T[] {
  const s = new Set(list);
  if (s.has(id)) {
    s.delete(id);
  } else {
    s.add(id);
  }
  return [...s].sort() as T[];
}

const linkBase =
  "block rounded-lg px-2 py-1.5 text-sm transition hover:bg-[#faf8f5] hover:text-[#96741f]";
const linkActive = "bg-[#f0ead8] font-semibold text-[var(--foreground)]";
const linkInactive = "text-[var(--foreground)]/90";

type SizeFacetGroup = {
  title: string;
  facets: ShopFacetChip[];
};

function groupSizeFacets(facets: ShopFacetChip[]): SizeFacetGroup[] {
  const eu: ShopFacetChip[] = [];
  const frame: ShopFacetChip[] = [];
  const clothing: ShopFacetChip[] = [];
  const wheel: ShopFacetChip[] = [];
  const other: ShopFacetChip[] = [];

  for (const f of facets) {
    if (f.id.startsWith("eu-")) {
      eu.push(f);
    } else if (f.id.startsWith("frame-")) {
      frame.push(f);
    } else if (f.id.startsWith("maat-")) {
      clothing.push(f);
    } else if (f.id.startsWith("wiel-")) {
      wheel.push(f);
    } else {
      other.push(f);
    }
  }

  const groups: SizeFacetGroup[] = [];
  if (eu.length) groups.push({ title: "Schoenmaat (EU)", facets: eu });
  if (frame.length) groups.push({ title: "Framemaat", facets: frame });
  if (clothing.length) groups.push({ title: "Kledingmaat", facets: clothing });
  if (wheel.length) groups.push({ title: "Wielmaat", facets: wheel });
  if (other.length) groups.push({ title: "Maat", facets: other });
  return groups;
}

function SizeFacetSection({
  title,
  facets,
  selectedSizes,
  activeCategorySlug,
  listingBase,
}: {
  title: string;
  facets: ShopFacetChip[];
  selectedSizes: string[];
  activeCategorySlug: string | null;
  listingBase: {
    page: 1;
    colors: string[];
    sizes: string[];
    search: string | null;
    sort?: ShopListingSort;
    view: ShopMerchView | null;
  };
}) {
  if (!facets.length) {
    return null;
  }
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground)]/55">{title}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {facets.map((f) => {
          const active = selectedSizes.includes(f.id);
          const next = toggle(selectedSizes, f.id);
          return (
            <LocalizedLink
              key={f.id}
              href={buildShopListingUrl({
                cat: activeCategorySlug,
                ...listingBase,
                sizes: next,
              })}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                active
                  ? "border-[#B38F27] bg-[#B38F27] text-white"
                  : "border-[#e5dcc8] bg-white text-[var(--foreground)] hover:border-[#B38F27]/35"
              }`}
            >
              {f.label}
            </LocalizedLink>
          );
        })}
      </div>
    </div>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function ShopSidebar({
  activeCategorySlug,
  selectedColors,
  selectedSizes,
  colorFacets,
  sizeFacets,
  searchQuery,
  sort,
  merchView = null,
  hideFacets,
}: ShopSidebarProps) {
  const { tree } = useCategories();
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const [mobileFacetsOpen, setMobileFacetsOpen] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const visibleCategoryRoots =
    showAllCategories || tree.length <= CATEGORY_PREVIEW_COUNT
      ? tree
      : tree.slice(0, CATEGORY_PREVIEW_COUNT);
  const hasMoreCategories = tree.length > CATEGORY_PREVIEW_COUNT;
  const hasFacetSelection = selectedColors.length > 0 || selectedSizes.length > 0;
  const activeFacetCount = selectedColors.length + selectedSizes.length;
  const search = searchQuery?.trim() || null;
  const listingBase = {
    page: 1 as const,
    colors: selectedColors,
    sizes: selectedSizes,
    search,
    sort,
    view: merchView,
  };

  const activeNode =
    activeCategorySlug?.trim() &&
    flattenRalexCategoryTree(tree).find(
      (n) => n.slug.toLowerCase() === activeCategorySlug.trim().toLowerCase(),
    );
  const activeCategoryTitle = activeNode ? formatRalexCategoryName(activeNode.name, activeNode.slug) : null;
  const sizeFacetGroups = groupSizeFacets(sizeFacets);

  return (
    <div className="space-y-6 rounded-2xl border border-[#e5dcc8] bg-white p-4 shadow-sm">
      <div>
        <button
          type="button"
          aria-expanded={mobileCategoriesOpen}
          aria-controls="shop-categories-panel"
          className="mb-0 flex w-full items-center justify-between gap-2 rounded-xl border border-[#e5dcc8] bg-[#faf8f4] px-3 py-2.5 text-left text-sm font-semibold text-[var(--foreground)] transition hover:border-[#B38F27]/25 lg:hidden"
          onClick={() => setMobileCategoriesOpen((v) => !v)}
        >
          <span className="min-w-0 truncate">
            Categorieën
            {activeCategoryTitle ? (
              <span className="font-normal text-[var(--foreground)]/70"> · {activeCategoryTitle}</span>
            ) : null}
          </span>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-[var(--foreground)]/70 transition-transform ${mobileCategoriesOpen ? "rotate-180" : ""}`}
          />
        </button>

        <div
          id="shop-categories-panel"
          className={`${mobileCategoriesOpen ? "block" : "hidden"} lg:block`}
        >
          <p className="hidden text-[11px] font-bold uppercase tracking-wider text-[var(--foreground)]/55 lg:block">
            Categorieën
          </p>
          <nav className="mt-0 space-y-0.5 pr-1 lg:mt-2" aria-label="Webshop categorieën">
            <LocalizedLink
              href={buildShopListingUrl({
                cat: null,
                ...listingBase,
                colors: [],
                sizes: [],
                view: null,
              })}
              className={`${linkBase} ${!activeCategorySlug ? linkActive : linkInactive}`}
            >
              Alle producten
            </LocalizedLink>
            {visibleCategoryRoots.map((root) => {
              const active =
                (activeCategorySlug ?? "").toLowerCase() === root.slug.toLowerCase();
              return (
                <LocalizedLink
                  key={root.id}
                  href={buildShopListingUrl({
                    cat: root.slug,
                    ...listingBase,
                    colors: [],
                    sizes: [],
                    view: null,
                  })}
                  className={`${linkBase} ${active ? linkActive : linkInactive}`}
                >
                  {formatRalexCategoryName(root.name, root.slug)}
                </LocalizedLink>
              );
            })}
            {hasMoreCategories ? (
              <button
                type="button"
                className="mt-1 w-full rounded-lg px-2 py-2 text-left text-sm font-semibold text-[#96741f] underline decoration-[#e5dcc8] underline-offset-2 hover:bg-[#faf8f5]"
                onClick={() => setShowAllCategories((v) => !v)}
              >
                {showAllCategories ? "Minder tonen" : "Meer tonen"}
              </button>
            ) : null}
          </nav>
        </div>
      </div>

      {!hideFacets ? (
        <>
          <button
            type="button"
            id="shop-facets-toggle"
            aria-expanded={mobileFacetsOpen}
            aria-controls="shop-facets-panel"
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#e5dcc8] bg-[#faf8f4] px-3 py-2.5 text-left text-sm font-semibold text-[var(--foreground)] transition hover:border-[#B38F27]/25 lg:hidden"
            onClick={() => setMobileFacetsOpen((v) => !v)}
          >
            <span>Filters kleur & maat</span>
            <span className="flex shrink-0 items-center gap-2">
              {activeFacetCount > 0 ? (
                <span className="rounded-full bg-[#B38F27] px-2 py-0.5 text-[11px] font-bold text-white">
                  {activeFacetCount}
                </span>
              ) : null}
              <ChevronDown
                className={`h-5 w-5 text-[var(--foreground)]/70 transition-transform ${mobileFacetsOpen ? "rotate-180" : ""}`}
              />
            </span>
          </button>

          <div
            id="shop-facets-panel"
            role="region"
            aria-label="Filters kleur en maat"
            className={`space-y-6 ${mobileFacetsOpen ? "block" : "hidden"} lg:block`}
          >
            {colorFacets.length > 0 ? (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground)]/55">Kleur</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {colorFacets.map((f) => {
                  const active = selectedColors.includes(f.id);
                  const next = toggle(selectedColors, f.id);
                  return (
                    <LocalizedLink
                      key={f.id}
                      href={buildShopListingUrl({
                        cat: activeCategorySlug,
                        ...listingBase,
                        colors: next,
                      })}
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                        active
                          ? "border-[#B38F27] bg-[#B38F27] text-white"
                          : "border-[#e5dcc8] bg-white text-[var(--foreground)] hover:border-[#B38F27]/35"
                      }`}
                    >
                      {f.label}
                    </LocalizedLink>
                  );
                })}
              </div>
            </div>
            ) : null}

            {sizeFacetGroups.map((group) => (
              <SizeFacetSection
                key={group.title}
                title={group.title}
                facets={group.facets}
                selectedSizes={selectedSizes}
                activeCategorySlug={activeCategorySlug}
                listingBase={listingBase}
              />
            ))}

            {hasFacetSelection ? (
              <LocalizedLink
                href={buildShopListingUrl({
                  cat: activeCategorySlug,
                  ...listingBase,
                  colors: [],
                  sizes: [],
                })}
                className="block text-center text-xs font-semibold text-[#96741f] underline underline-offset-2"
              >
                Wis kleur- en maatfilters
              </LocalizedLink>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

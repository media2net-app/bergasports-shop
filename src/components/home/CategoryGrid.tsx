"use client";

import Image from "next/image";
import Link from "next/link";

import { useCategories } from "@/components/categories/CategoriesProvider";
import { formatRalexCategoryName } from "@/lib/ralex-categories";
import { buildShopListingUrl } from "@/lib/shop-category-filter";

const HOME_CATEGORY_IMAGES: Record<string, string> = {
  "baie-si-piscina": "/home/categories/baie-piscina-spa.png",
  "camera-hotel": "/home/categories/camera.png",
  restaurant: "/home/categories/restaurant.png",
};

function categoryHref(slug: string) {
  return buildShopListingUrl({ cat: slug, page: 1, colors: [], sizes: [], search: null });
}

function categoryImageSrc(slug: string): string | null {
  return HOME_CATEGORY_IMAGES[slug.toLowerCase()] ?? null;
}

export default function CategoryGrid() {
  const { tree } = useCategories();

  if (!tree.length) {
    return null;
  }

  return (
    <section className="mt-10 w-full md:mt-12">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="text-2xl font-semibold text-[var(--foreground)] md:font-[family-name:var(--font-heading)] md:text-3xl">
          Shop per categorie
        </h2>
        <Link href="/categorii" className="text-sm font-semibold text-[#96741f] hover:underline">
          Alle categorieën →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
        {tree.map((root) => {
          const imageSrc = categoryImageSrc(root.slug);
          const title = formatRalexCategoryName(root.name, root.slug);
          const hasImage = Boolean(imageSrc);

          return (
            <Link
              key={root.id}
              href={categoryHref(root.slug)}
              className={`group relative flex min-h-[14rem] overflow-hidden rounded-2xl border transition hover:-translate-y-0.5 hover:shadow-lg sm:min-h-[16rem] ${
                hasImage
                  ? "border-[#e5dcc8]/80"
                  : "border-[#e5dcc8] bg-white hover:shadow-md"
              }`}
            >
              {imageSrc ? (
                <>
                  <Image
                    src={imageSrc}
                    alt=""
                    fill
                    className="object-cover object-center transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    aria-hidden
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/40 to-black/25"
                    aria-hidden
                  />
                </>
              ) : null}

              <div
                className={`relative z-10 flex w-full flex-col justify-start p-5 md:p-6 ${
                  hasImage ? "text-white" : "text-[var(--foreground)]"
                }`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-wider ${
                    hasImage ? "text-white/80" : "text-[var(--foreground)]/60"
                  }`}
                >
                  {root.count} producten
                </p>
                <h3 className="mt-2 text-lg font-semibold leading-snug md:text-xl">{title}</h3>
                {root.children?.length ? (
                  <ul
                    className={`mt-3 space-y-1 text-sm ${
                      hasImage ? "text-white/85" : "text-[var(--foreground)]/75"
                    }`}
                  >
                    {root.children.map((ch) => (
                      <li key={ch.id}>
                        <span
                          className={
                            hasImage
                              ? "group-hover:text-[#f5d78a]"
                              : "group-hover:text-[#96741f]"
                          }
                          onClick={(e) => e.stopPropagation()}
                        >
                          {formatRalexCategoryName(ch.name, ch.slug)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

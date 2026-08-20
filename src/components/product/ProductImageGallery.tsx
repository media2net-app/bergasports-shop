"use client";

import { useMemo, useState } from "react";

import { useShopLocale } from "@/components/locale/ShopLanguagesProvider";
import { useProductVariation } from "@/components/product/ProductVariationContext";
import OptimizedProductImage from "@/components/ui/OptimizedProductImage";
import { ui } from "@/lib/i18n/ui";

const arrowClassName =
  "absolute top-1/2 -translate-y-1/2 rounded-full border border-[var(--brand-border)] bg-white/95 p-2.5 text-[var(--foreground)] transition hover:border-[var(--brand)] hover:text-[var(--brand)] lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100";

function thumbClassName(active: boolean): string {
  return `overflow-hidden rounded-xl border transition ${
    active
      ? "border-[var(--brand)] ring-1 ring-[var(--brand)]"
      : "border-[var(--brand-border)] hover:border-[var(--brand)]/50"
  }`;
}

type ProductImageGalleryProps = {
  images: string[];
  name: string;
  /** Fallback when no variation context (e.g. landing promo layout). */
  initialHighlightImage?: string;
};

export default function ProductImageGallery({
  images,
  name,
  initialHighlightImage,
}: ProductImageGalleryProps) {
  const { locale } = useShopLocale();
  const t = ui(locale);
  const variation = useProductVariation();
  const highlightImage = variation?.highlightImage?.trim() || initialHighlightImage?.trim();

  const galleryImages = useMemo(() => {
    const filtered = images.filter(Boolean);
    const highlight = highlightImage;
    if (highlight) {
      const rest = filtered.filter((url) => url !== highlight);
      return [highlight, ...rest].length > 0 ? [highlight, ...rest] : [highlight];
    }
    return filtered.length > 0 ? filtered : [""];
  }, [images, highlightImage]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [renderedHighlight, setRenderedHighlight] = useState(highlightImage);

  /* Nieuwe variantfoto: terug naar de eerste slide, tijdens render i.p.v. in een effect. */
  if (renderedHighlight !== highlightImage) {
    setRenderedHighlight(highlightImage);
    setSelectedIndex(0);
  }

  const prevImage = () => {
    setSelectedIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  };

  const nextImage = () => {
    setSelectedIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <div>
      <div className="flex items-start gap-2 md:gap-3">
        {galleryImages.length > 1 ? (
          <div className="hidden w-20 shrink-0 flex-col gap-2 lg:flex">
            {galleryImages.slice(0, 6).map((imageUrl, index) => (
              <button
                key={`${imageUrl}-${index}`}
                className={thumbClassName(index === selectedIndex)}
                aria-label={t.viewImageN(index + 1)}
                aria-current={index === selectedIndex}
                onClick={() => setSelectedIndex(index)}
              >
                <OptimizedProductImage
                  src={imageUrl}
                  alt={t.galleryThumbAlt(name, index + 1)}
                  variant="galleryThumb"
                />
              </button>
            ))}
          </div>
        ) : null}

        <div className="group relative w-full">
          <OptimizedProductImage
            src={galleryImages[selectedIndex]}
            alt={name}
            variant="galleryHero"
            priority={selectedIndex === 0}
            wrapperClassName="rounded-2xl border border-[var(--brand-border)]"
          />

          {galleryImages.length > 1 ? (
            <>
              <button
                className={`${arrowClassName} left-3`}
                onClick={prevImage}
                aria-label={t.prevImage}
              >
                &#8592;
              </button>
              <button
                className={`${arrowClassName} right-3`}
                onClick={nextImage}
                aria-label={t.nextImage}
              >
                &#8594;
              </button>
              <p className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-[var(--foreground)]/70">
                {selectedIndex + 1} / {galleryImages.length}
              </p>
            </>
          ) : null}
        </div>
      </div>

      {galleryImages.length > 1 ? (
        <div className="mt-3 grid grid-cols-5 gap-2 lg:hidden">
          {galleryImages.slice(0, 10).map((imageUrl, index) => (
            <button
              key={`${imageUrl}-${index}`}
              className={thumbClassName(index === selectedIndex)}
              aria-label={t.viewImageN(index + 1)}
              aria-current={index === selectedIndex}
              onClick={() => setSelectedIndex(index)}
            >
              <OptimizedProductImage
                src={imageUrl}
                alt={t.galleryThumbAlt(name, index + 1)}
                variant="galleryThumb"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

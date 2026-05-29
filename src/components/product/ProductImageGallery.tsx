"use client";

import { useEffect, useMemo, useState } from "react";

import { useProductVariation } from "@/components/product/ProductVariationContext";
import OptimizedProductImage from "@/components/ui/OptimizedProductImage";

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

  useEffect(() => {
    setSelectedIndex(0);
  }, [highlightImage]);

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
                className={`overflow-hidden rounded-lg border ${
                  index === selectedIndex ? "border-[#B38F27]" : "border-[#e5dcc8]"
                }`}
                onClick={() => setSelectedIndex(index)}
              >
                <OptimizedProductImage
                  src={imageUrl}
                  alt={`${name} miniatuur ${index + 1}`}
                  variant="galleryThumb"
                />
              </button>
            ))}
          </div>
        ) : null}

        <div className="relative w-full">
          <OptimizedProductImage
            src={galleryImages[selectedIndex]}
            alt={name}
            variant="galleryHero"
            priority={selectedIndex === 0}
            wrapperClassName="rounded-2xl border border-[#e5dcc8]"
          />

          {galleryImages.length > 1 ? (
            <>
              <button
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2.5 text-[var(--foreground)] shadow transition hover:bg-white md:left-3"
                onClick={prevImage}
                aria-label="Vorige afbeelding"
              >
                &#8592;
              </button>
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2.5 text-[var(--foreground)] shadow transition hover:bg-white md:right-3"
                onClick={nextImage}
                aria-label="Volgende afbeelding"
              >
                &#8594;
              </button>
            </>
          ) : null}
        </div>
      </div>

      {galleryImages.length > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-3 lg:hidden">
          {galleryImages.slice(0, 8).map((imageUrl, index) => (
            <button
              key={`${imageUrl}-${index}`}
              className={`overflow-hidden rounded-lg border ${
                index === selectedIndex ? "border-[#B38F27]" : "border-[#e5dcc8]"
              }`}
              onClick={() => setSelectedIndex(index)}
            >
              <OptimizedProductImage
                src={imageUrl}
                alt={`${name} miniatura ${index + 1}`}
                variant="galleryThumb"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

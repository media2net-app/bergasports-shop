import Image from "next/image";

import { isOptimizableProductImageUrl } from "@/lib/product-image-url";

export type OptimizedProductImageVariant =
  | "card"
  | "galleryHero"
  | "galleryThumb"
  | "cartThumb"
  | "searchThumb"
  | "homeCard";

const VARIANT: Record<
  OptimizedProductImageVariant,
  { sizes: string; quality: number; aspect: string }
> = {
  card: {
    sizes: "(max-width: 640px) 45vw, (max-width: 1024px) 33vw, 320px",
    quality: 82,
    aspect: "aspect-[4/3]",
  },
  galleryHero: {
    sizes: "(max-width: 1024px) 100vw, min(640px, 50vw)",
    quality: 88,
    aspect: "aspect-[4/3]",
  },
  galleryThumb: {
    sizes: "80px",
    quality: 75,
    aspect: "aspect-square",
  },
  cartThumb: {
    sizes: "64px",
    quality: 75,
    aspect: "aspect-square",
  },
  searchThumb: {
    sizes: "48px",
    quality: 75,
    aspect: "aspect-square",
  },
  homeCard: {
    sizes: "(max-width: 640px) 42vw, 240px",
    quality: 78,
    aspect: "aspect-[4/3]",
  },
};

const VARIANT_SURFACE: Partial<Record<OptimizedProductImageVariant, string>> = {
  card: "bg-[#f3f2f0]",
  homeCard: "bg-[#f3f2f0]",
  galleryHero: "bg-[#f3f2f0]",
  galleryThumb: "bg-[#f3f2f0]",
};

type Props = {
  src: string | undefined | null;
  alt: string;
  variant: OptimizedProductImageVariant;
  priority?: boolean;
  className?: string;
  wrapperClassName?: string;
};

function wrapperClasses(aspect: string, wrapperClassName: string) {
  /* Avoid w-full when caller sets w-* (e.g. cart h-16 w-16); else w-full + aspect-square fills the row. */
  const hasWidthUtility = /\bw-[^\s]+/.test(wrapperClassName);
  return ["relative", "overflow-hidden", !hasWidthUtility && "w-full", aspect, wrapperClassName]
    .filter(Boolean)
    .join(" ");
}

export default function OptimizedProductImage({
  src,
  alt,
  variant,
  priority = false,
  className = "object-contain",
  wrapperClassName = "",
}: Props) {
  const cfg = VARIANT[variant];
  const srcTrim = src?.trim() ?? "";
  const wrapper = wrapperClasses(cfg.aspect, wrapperClassName);

  const surface = VARIANT_SURFACE[variant] ?? "bg-white";
  const frame = `${wrapper} ${surface}`;

  if (!srcTrim) {
    return <div className={frame} aria-hidden />;
  }

  if (!isOptimizableProductImageUrl(srcTrim)) {
    return (
      <div className={frame}>
        <img
          src={srcTrim}
          alt={alt}
          className={`h-full w-full bg-white ${className}`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
        />
      </div>
    );
  }

  return (
    <div className={frame}>
      <Image
        src={srcTrim}
        alt={alt}
        fill
        sizes={cfg.sizes}
        quality={cfg.quality}
        priority={priority}
        className={`bg-white ${className}`}
      />
    </div>
  );
}

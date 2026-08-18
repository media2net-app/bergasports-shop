import Image from "next/image";
import LocalizedLink from "@/components/locale/LocalizedLink";

import {
  SITE_BRAND_NAME,
  SITE_LOGO_HEIGHT,
  SITE_LOGO_SRC,
  SITE_LOGO_WIDTH,
  SITE_SLOGAN,
} from "@/lib/site-brand";

type Props = {
  className?: string;
  /** Smaller logo (admin sidebar). */
  compact?: boolean;
};

export default function BrandWordmark({ className = "", compact = false }: Props) {
  return (
    <LocalizedLink
      href="/"
      className={`group block shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 ${className}`}
      aria-label={`${SITE_BRAND_NAME} — ${SITE_SLOGAN}`}
    >
      <Image
        src={SITE_LOGO_SRC}
        alt={SITE_BRAND_NAME}
        width={SITE_LOGO_WIDTH}
        height={SITE_LOGO_HEIGHT}
        priority
        className={`w-auto object-contain object-center transition group-hover:opacity-90 ${
          compact ? "h-6 max-w-[160px]" : "h-7 max-w-[200px] md:h-8 md:max-w-[220px]"
        }`}
      />
    </LocalizedLink>
  );
}

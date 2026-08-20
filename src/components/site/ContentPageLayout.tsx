import type { ReactNode } from "react";

import ContentCtaCard from "@/components/site/ContentCtaCard";
import { getRequestLocale } from "@/lib/i18n/locale";
import { ui } from "@/lib/i18n/ui";
import { LEGAL_PAGE_PATHS } from "@/lib/site-content";

const LEGAL_PATHS = new Set<string>(Object.values(LEGAL_PAGE_PATHS));

export type ContentPageLayoutProps = {
  path: string;
  heading: string;
  bodyHtml?: string;
  featured?: string | null;
  featuredAlt?: string | null;
  updatedAt?: string | null;
  aside?: ReactNode;
  /** Toon conversie-CTA’s; standaard aan behalve op juridische pagina’s. */
  showCtas?: boolean;
};

function formatPageUpdatedAt(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default async function ContentPageLayout({
  path,
  heading,
  bodyHtml,
  featured,
  featuredAlt,
  updatedAt,
  aside,
  showCtas,
}: ContentPageLayoutProps) {
  const locale = await getRequestLocale();
  const t = ui(locale);
  const conversion = showCtas ?? !LEGAL_PATHS.has(path);
  const hasSidebar = conversion || Boolean(aside);
  const hero = featured?.trim() || "";
  const heroAlt = featuredAlt?.trim() || heading;
  const updatedLabel = updatedAt ? formatPageUpdatedAt(updatedAt, locale) : null;

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-8 md:py-12 lg:px-6">
      <div
        className={
          hasSidebar
            ? "grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-14"
            : "mx-auto max-w-[760px]"
        }
      >
        <article className="min-w-0">
          {conversion ? (
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
              Bergasports · Dedemsvaart
            </p>
          ) : null}
          <h1 className="section-rule font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl lg:text-[2.6rem]">
            {heading}
          </h1>
          {hero ? (
            <figure className="mt-8 overflow-hidden rounded-3xl border border-[var(--brand-border)] bg-[var(--brand-surface-alt)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hero}
                alt={heroAlt}
                className="max-h-[min(70vh,540px)] w-full object-cover object-center"
              />
            </figure>
          ) : null}
          {bodyHtml ? (
            <div
              className="cms-html cms-page-body mt-8 max-w-[720px] text-[var(--foreground)]/85"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          ) : null}
          {!conversion && updatedLabel ? (
            <p className="mt-10 text-xs text-[var(--foreground)]/45">
              {t.lastUpdated} {updatedLabel}
            </p>
          ) : null}
        </article>

        {hasSidebar ? (
          <aside className="space-y-4 lg:sticky lg:top-28">
            {conversion ? <ContentCtaCard /> : null}
            {aside}
          </aside>
        ) : null}
      </div>
    </section>
  );
}

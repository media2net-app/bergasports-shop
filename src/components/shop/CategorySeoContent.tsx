import LocalizedLink from "@/components/locale/LocalizedLink";

import type { CategorySeoContent } from "@/lib/category-seo";

type Props = {
  seo: CategorySeoContent;
  /** Hide product list in footer when paginated view is filtered heavily */
  showProductLinks?: boolean;
};

export function CategorySeoIntro({ seo }: { seo: CategorySeoContent }) {
  return (
    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--foreground)]/85 md:text-base">
      {seo.intro}
    </p>
  );
}

export function CategorySeoFooter({ seo, showProductLinks = true }: Props) {
  return (
    <article
      className="mt-12 rounded-2xl border border-[#e5dcc8] bg-white p-5 md:mt-14 md:p-8"
      aria-label="Categorie-informatie"
    >
      <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-[var(--foreground)] md:text-2xl">
        {seo.footerTitle}
      </h2>

      <div className="mt-4 space-y-4 text-sm leading-relaxed text-[var(--foreground)]/88 md:text-base">
        {seo.footerParagraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      {seo.customFooterHtml ? (
        <div
          className="wc-store-html mt-6 border-t border-[#e5dcc8] pt-6 text-sm text-[var(--foreground)]/88"
          dangerouslySetInnerHTML={{ __html: seo.customFooterHtml }}
        />
      ) : null}

      {showProductLinks && seo.productLinks.length > 0 ? (
        <section className="mt-8 border-t border-[#e5dcc8] pt-6">
          <h3 className="text-base font-semibold text-[var(--foreground)] md:text-lg">
            Populaire producten in deze categorie
          </h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {seo.productLinks.map((link) => (
              <li key={link.href}>
                <LocalizedLink
                  href={link.href}
                  className="text-sm font-medium text-[#96741f] underline decoration-[#e5dcc8] underline-offset-2 hover:text-[var(--foreground)]"
                >
                  {link.label}
                </LocalizedLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {seo.relatedCategoryLinks.length > 0 ? (
        <section className="mt-8 border-t border-[#e5dcc8] pt-6">
          <h3 className="text-base font-semibold text-[var(--foreground)] md:text-lg">Gerelateerde categorieën</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {seo.relatedCategoryLinks.map((link) => (
              <li key={link.href}>
                <LocalizedLink
                  href={link.href}
                  className="inline-block rounded-full border border-[#e5dcc8] bg-[#faf8f4] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:border-[#B38F27]/30"
                >
                  {link.label}
                </LocalizedLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-8 text-sm text-[var(--foreground)]/75">
        <LocalizedLink href="/shop" className="font-semibold text-[#96741f] underline underline-offset-2">
          Bekijk de volledige Bergasports-webshop
        </LocalizedLink>
        {" · "}
        <LocalizedLink href="/contact" className="font-semibold text-[#96741f] underline underline-offset-2">
          Contact
        </LocalizedLink>
      </p>
    </article>
  );
}

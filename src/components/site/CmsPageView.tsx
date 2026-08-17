import type { SitePageRow } from "@/lib/site-pages";

type CmsPageViewProps = {
  page: SitePageRow;
};

function formatPageUpdatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function CmsPageView({ page }: CmsPageViewProps) {
  const heading = page.heading?.trim() || page.title;
  const updatedLabel = page.updated_at ? formatPageUpdatedAt(page.updated_at) : null;
  const featured = page.social_image?.trim() || "";
  const featuredAlt = page.image_alt?.trim() || heading;

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-8 md:py-12">
      <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold text-[var(--foreground)] md:text-4xl">
        {heading}
      </h1>
      {updatedLabel ? (
        <p className="mt-2 text-xs text-[var(--foreground)]/55">Laatst bijgewerkt: {updatedLabel}</p>
      ) : null}
      {featured ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={featured}
          alt={featuredAlt}
          className="mt-6 w-full max-w-[760px] object-cover"
        />
      ) : null}
      {page.body_html ? (
        <div
          className="cms-html cms-page-body mt-5 max-w-[760px] text-sm leading-7 text-[var(--foreground)]/85 md:text-base"
          dangerouslySetInnerHTML={{ __html: page.body_html }}
        />
      ) : null}
    </section>
  );
}

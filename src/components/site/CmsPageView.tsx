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

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-8 md:py-12">
      <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold text-[var(--foreground)] md:text-4xl">
        {heading}
      </h1>
      {updatedLabel ? (
        <p className="mt-2 text-xs text-[var(--foreground)]/55">Laatst bijgewerkt: {updatedLabel}</p>
      ) : null}
      {page.body_html ? (
        <div
          className="cms-page-body mt-5 max-w-[760px] text-sm leading-7 text-[var(--foreground)]/85 md:text-base [&_a]:font-semibold [&_a]:text-[var(--topbar)] [&_a]:underline [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-[var(--foreground)] [&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full [&_li]:mt-2 [&_p+p]:mt-4 [&_ul]:list-disc [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: page.body_html }}
        />
      ) : null}
    </section>
  );
}

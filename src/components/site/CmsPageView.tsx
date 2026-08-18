import type { ReactNode } from "react";

import ContentPageLayout from "@/components/site/ContentPageLayout";
import type { SitePageRow } from "@/lib/site-pages";

export type CmsPageViewPage = Pick<
  SitePageRow,
  "path" | "title" | "heading" | "body_html" | "social_image" | "image_alt"
> & {
  updated_at?: string | null;
};

type CmsPageViewProps = {
  page: CmsPageViewPage;
  aside?: ReactNode;
  showCtas?: boolean;
};

export default async function CmsPageView({ page, aside, showCtas }: CmsPageViewProps) {
  const heading = page.heading?.trim() || page.title;

  return (
    <ContentPageLayout
      path={page.path}
      heading={heading}
      bodyHtml={page.body_html}
      featured={page.social_image}
      featuredAlt={page.image_alt}
      updatedAt={page.updated_at}
      aside={aside}
      showCtas={showCtas}
    />
  );
}

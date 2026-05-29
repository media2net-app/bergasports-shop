import { notFound } from "next/navigation";

import AdminPageEditor from "@/components/admin/AdminPageEditor";
import { getSitePageById } from "@/lib/site-pages-db";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminPageEditPage({ params }: PageProps) {
  const id = Number.parseInt((await params).id, 10);
  if (!Number.isFinite(id)) {
    notFound();
  }
  const page = await getSitePageById(id);
  if (!page) {
    notFound();
  }
  return <AdminPageEditor page={page} />;
}

import Link from "next/link";

import AdminPagesList, { type AdminPageListRow } from "@/components/admin/AdminPagesList";
import { listSitePages } from "@/lib/site-pages-db";

export const dynamic = "force-dynamic";

export default async function AdminPagesListPage() {
  const pages = await listSitePages();
  const rows: AdminPageListRow[] = pages.map((page) => ({
    id: page.id,
    title: page.title,
    path: page.path,
    slug: page.slug,
    isPublished: page.is_published,
    updatedAt: page.updated_at,
  }));
  const count = rows.length;

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1">Pagina&apos;s</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            {count === 0
              ? "Bewerk homepage, contact, merken en andere vaste content. Concepten blijven privé."
              : `${count} ${count === 1 ? "pagina" : "pagina's"} · homepage, contact en andere vaste content. Concepten blijven privé.`}
          </p>
        </div>
        <Link href="/admin/pages/new" className="admin-btn-primary">
          Nieuwe pagina
        </Link>
      </div>

      <AdminPagesList rows={rows} />
    </div>
  );
}

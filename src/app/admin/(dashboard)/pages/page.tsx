import Link from "next/link";

import { listSitePages } from "@/lib/site-pages-db";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" });
}

export default async function AdminPagesListPage() {
  const pages = await listSitePages();

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Pagina&apos;s</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Bewerk homepage, contact en andere vaste content op de shop.
          </p>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Page</th>
              <th>Path</th>
              <th>Status</th>
              <th>Updated</th>
              <th className="admin-td-right" />
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id} className="admin-table-row-click">
                <td>
                  <span className="font-medium">{page.title}</span>
                  {page.heading && page.heading !== page.title ? (
                    <div className="admin-muted" style={{ fontSize: "0.8rem" }}>
                      H1: {page.heading}
                    </div>
                  ) : null}
                </td>
                <td className="admin-td-mono">
                  <code>{page.path}</code>
                </td>
                <td>
                  <span className="admin-badge-src">{page.is_published ? "Published" : "Draft"}</span>
                </td>
                <td className="admin-muted admin-text-sm">{formatDate(page.updated_at)}</td>
                <td className="admin-td-right">
                  <Link href={`/admin/pages/${page.id}`} className="admin-link-action">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

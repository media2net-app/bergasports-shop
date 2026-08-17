import Link from "next/link";

import { loadAdminNewsPosts } from "@/lib/news-db";

export const dynamic = "force-dynamic";

export default async function AdminNewsPage() {
  const posts = await loadAdminNewsPosts();
  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1">Nieuws</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Schrijf berichten over fietsen, LaFuga, Nimbl of wedstrijden. Concepten blijven privé.
          </p>
        </div>
        <Link href="/admin/news/new" className="admin-btn-primary">
          Nieuw bericht
        </Link>
      </div>
      <div className="admin-panel admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Titel</th>
              <th>Categorie</th>
              <th>Status</th>
              <th>Datum</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-muted">
                  Nog geen berichten.
                </td>
              </tr>
            ) : (
              posts.map((p) => (
                <tr key={p.id}>
                  <td>{p.title}</td>
                  <td className="admin-muted">{p.category ?? "—"}</td>
                  <td>
                    <span className="admin-badge-src">{p.isPublished ? "Gepubliceerd" : "Concept"}</span>
                  </td>
                  <td className="admin-muted">
                    {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("nl-NL") : "—"}
                  </td>
                  <td className="admin-td-right">
                    <Link href={`/admin/news/${p.id}`} className="admin-link-action">
                      Bewerken
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

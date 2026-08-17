"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export type AdminPageListRow = {
  id: number;
  title: string;
  path: string;
  slug: string;
  isPublished: boolean;
  updatedAt: string;
};

type Props = {
  rows: AdminPageListRow[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" });
}

function isHomepage(row: AdminPageListRow) {
  return row.slug === "home" || row.path === "/";
}

function StatusBadge({ published }: { published: boolean }) {
  if (published) {
    return <span className="admin-badge-published">Gepubliceerd</span>;
  }
  return <span className="admin-badge-concept">Concept</span>;
}

export default function AdminPagesList({ rows }: Props) {
  const router = useRouter();

  if (rows.length === 0) {
    return (
      <div className="admin-panel">
        <p className="admin-muted admin-m-0">Nog geen pagina&apos;s.</p>
        <p className="admin-muted admin-mt-05">
          Maak een homepage of contentpagina om te beginnen.
        </p>
        <p className="admin-mt-05">
          <Link href="/admin/pages/new" className="admin-link-action">
            Nieuwe pagina
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="admin-table-desktop-wrap">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Titel</th>
                <th scope="col">Pad</th>
                <th scope="col">Status</th>
                <th scope="col">Bijgewerkt</th>
                <th className="admin-td-right" scope="col" aria-label="Acties" />
              </tr>
            </thead>
            <tbody>
              {rows.map((page) => {
                const href = `/admin/pages/${page.id}`;
                const home = isHomepage(page);
                return (
                  <tr
                    key={page.id}
                    className="admin-table-row-click"
                    onClick={() => router.push(href)}
                    title="Klik om te bewerken"
                  >
                    <td>
                      <div className="admin-table-title">
                        <span className="admin-table-title-text" title={page.title}>
                          {page.title}
                        </span>
                        {home ? <span className="admin-badge-homepage">Homepage</span> : null}
                      </div>
                    </td>
                    <td className="admin-td-mono" title={page.path}>
                      {page.path}
                    </td>
                    <td>
                      <StatusBadge published={page.isPublished} />
                    </td>
                    <td className="admin-muted">{formatDate(page.updatedAt)}</td>
                    <td className="admin-td-right" onClick={(e) => e.stopPropagation()}>
                      <Link href={href} className="admin-link-action" onClick={(e) => e.stopPropagation()}>
                        Bewerken
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-product-cards-mobile" aria-label="Pagina's (mobiel)">
        {rows.map((page) => {
          const href = `/admin/pages/${page.id}`;
          const home = isHomepage(page);
          return (
            <Link key={page.id} href={href} className="admin-product-card admin-product-card--text">
              <div className="min-w-0">
                <div className="admin-product-card-title">
                  {page.title}
                  {home ? <span className="admin-badge-homepage">Homepage</span> : null}
                </div>
                <div className="admin-product-card-meta">
                  {page.path} · {page.isPublished ? "Gepubliceerd" : "Concept"} · {formatDate(page.updatedAt)}
                </div>
              </div>
              <span className="admin-link-action">Bewerken</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}

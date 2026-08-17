"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import type { AdminCategory } from "@/lib/categories-admin";
import { shopCategoryPath } from "@/lib/shop-category-filter";

export type AdminCategoryListRow = AdminCategory;

type Props = {
  rows: AdminCategoryListRow[];
};

function flattenTree(categories: AdminCategory[]): { category: AdminCategory; depth: number }[] {
  const children = new Map<number, AdminCategory[]>();
  for (const category of categories) {
    const list = children.get(category.parentId) ?? [];
    list.push(category);
    children.set(category.parentId, list);
  }
  for (const list of children.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "nl"));
  }
  const out: { category: AdminCategory; depth: number }[] = [];
  const walk = (parentId: number, depth: number) => {
    for (const category of children.get(parentId) ?? []) {
      out.push({ category, depth });
      walk(category.id, depth + 1);
    }
  };
  walk(0, 0);
  const seen = new Set(out.map((row) => row.category.id));
  for (const category of categories) {
    if (!seen.has(category.id)) {
      out.push({ category, depth: 0 });
    }
  }
  return out;
}

export default function AdminCategoriesList({ rows }: Props) {
  const router = useRouter();
  const tree = useMemo(() => flattenTree(rows), [rows]);

  if (tree.length === 0) {
    return (
      <div className="admin-panel">
        <p className="admin-muted admin-m-0">Nog geen categorieën.</p>
        <p className="admin-muted admin-mt-05">Maak een hoofdgroep of subcategorie om te beginnen.</p>
        <p className="admin-mt-05">
          <Link href="/admin/categories/new" className="admin-link-action">
            Nieuwe categorie
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
                <th scope="col">Naam</th>
                <th scope="col">Pad</th>
                <th className="admin-td-right" scope="col">
                  Producten
                </th>
                <th className="admin-td-right" scope="col" aria-label="Acties" />
              </tr>
            </thead>
            <tbody>
              {tree.map(({ category, depth }) => {
                const href = `/admin/categories/${category.id}`;
                const path = shopCategoryPath(category.slug);
                return (
                  <tr
                    key={category.id}
                    className="admin-table-row-click"
                    onClick={() => router.push(href)}
                    title="Klik om te bewerken"
                  >
                    <td>
                      <div className="admin-table-title">
                        <span
                          className="admin-table-title-text"
                          style={{ paddingLeft: `${depth * 1.1}rem` }}
                          title={category.name}
                        >
                          {category.name}
                        </span>
                      </div>
                    </td>
                    <td className="admin-td-mono" title={path}>
                      {path}
                    </td>
                    <td className="admin-td-right">{category.productCount}</td>
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

      <div className="admin-product-cards-mobile" aria-label="Categorieën (mobiel)">
        {tree.map(({ category, depth }) => {
          const href = `/admin/categories/${category.id}`;
          const path = shopCategoryPath(category.slug);
          return (
            <Link key={category.id} href={href} className="admin-product-card admin-product-card--text">
              <div className="min-w-0">
                <div className="admin-product-card-title" style={{ paddingLeft: `${depth * 0.75}rem` }}>
                  {category.name}
                </div>
                <div className="admin-product-card-meta">
                  {path} · {category.productCount} {category.productCount === 1 ? "product" : "producten"}
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

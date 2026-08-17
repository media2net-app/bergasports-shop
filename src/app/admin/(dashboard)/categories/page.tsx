import Link from "next/link";

import AdminCategoriesList from "@/components/admin/AdminCategoriesList";
import { listAdminCategories } from "@/lib/categories-admin";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await listAdminCategories();
  const count = categories.length;

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1">Categorieën</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            {count === 0
              ? "Beheer shopcategorieën, subgroepen en SEO-teksten."
              : `${count} ${count === 1 ? "categorie" : "categorieën"} · klik om te bewerken.`}
          </p>
        </div>
        <Link href="/admin/categories/new" className="admin-btn-primary">
          Nieuwe categorie
        </Link>
      </div>

      <AdminCategoriesList rows={categories} />
    </div>
  );
}

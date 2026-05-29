import AdminCategorySeoPanel from "@/components/admin/AdminCategorySeoPanel";
import { flattenRalexCategoryTree } from "@/lib/ralex-categories";
import { loadRalexCategories } from "@/lib/categories-db";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const { tree } = await loadRalexCategories();
  const categories = flattenRalexCategoryTree(tree)
    .map((n) => ({ slug: n.slug, name: n.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Categories &amp; SEO</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            SEO content for category pages. Product import remains under{" "}
            <a href="/admin/import" className="font-semibold text-[#96741f] underline">
              Import
            </a>
            .
          </p>
        </div>
      </div>
      <AdminCategorySeoPanel categories={categories} />
    </div>
  );
}

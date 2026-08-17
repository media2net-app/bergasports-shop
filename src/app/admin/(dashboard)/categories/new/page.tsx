import AdminCategoriesPanel from "@/components/admin/AdminCategoriesPanel";
import { listAdminCategories } from "@/lib/categories-admin";

export const dynamic = "force-dynamic";

export default async function AdminCategoryNewPage() {
  const categories = await listAdminCategories();
  return <AdminCategoriesPanel categories={categories} />;
}

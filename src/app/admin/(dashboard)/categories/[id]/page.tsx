import { notFound } from "next/navigation";

import AdminCategoriesPanel from "@/components/admin/AdminCategoriesPanel";
import { listAdminCategories } from "@/lib/categories-admin";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminCategoryEditPage({ params }: PageProps) {
  const id = Number.parseInt((await params).id, 10);
  if (!Number.isFinite(id)) {
    notFound();
  }
  const categories = await listAdminCategories();
  const category = categories.find((row) => row.id === id);
  if (!category) {
    notFound();
  }
  return <AdminCategoriesPanel category={category} categories={categories} />;
}

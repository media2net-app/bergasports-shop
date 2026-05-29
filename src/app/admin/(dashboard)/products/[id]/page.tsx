import { notFound } from "next/navigation";

import ProductEditorForm from "@/components/admin/ProductEditorForm";
import { getProductRawById } from "@/lib/trendyol-json-store";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminEditProductPage({ params }: PageProps) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (Number.isNaN(id)) {
    notFound();
  }
  const product = await getProductRawById(id);
  if (!product) {
    notFound();
  }

  return <ProductEditorForm initial={product} />;
}

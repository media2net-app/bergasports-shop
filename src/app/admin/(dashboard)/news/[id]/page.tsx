import { notFound } from "next/navigation";

import AdminNewsEditor from "@/components/admin/AdminNewsEditor";
import { loadNewsPostById } from "@/lib/news-db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminNewsEditPage({ params }: Props) {
  const { id } = await params;
  const post = await loadNewsPostById(id);
  if (!post) notFound();
  return <AdminNewsEditor post={post} />;
}

import AdminMediaLibrary from "@/components/admin/AdminMediaLibrary";
import { listMediaAssets } from "@/lib/media-assets-db";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  const assets = await listMediaAssets(160);
  return (
    <AdminMediaLibrary
      initialAssets={assets.map((asset) => ({
        ...asset,
        createdAt: asset.createdAt.toISOString(),
      }))}
    />
  );
}

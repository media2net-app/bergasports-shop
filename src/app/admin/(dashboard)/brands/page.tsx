import AdminBrandsPanel from "@/components/admin/AdminBrandsPanel";
import { listAdminBrands } from "@/lib/brands-db";

export const dynamic = "force-dynamic";

export default async function AdminBrandsPage() {
  const brands = await listAdminBrands().catch(() => []);
  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Merken</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Beheer merken apart van producten. Wijs ze toe in de producteditor; klanten filteren erop in de shop.
          </p>
        </div>
      </div>
      <AdminBrandsPanel initialBrands={brands} />
    </div>
  );
}

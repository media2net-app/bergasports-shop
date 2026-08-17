import AdminCouponsPanel from "@/components/admin/AdminCouponsPanel";
import { listAdminCoupons } from "@/lib/coupons-admin";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const coupons = await listAdminCoupons().catch(() => []);
  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Kortingscodes</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Codes voor de checkout, win-backmails en herhaalbestellingen.
          </p>
        </div>
      </div>
      <AdminCouponsPanel initialCoupons={coupons} />
    </div>
  );
}

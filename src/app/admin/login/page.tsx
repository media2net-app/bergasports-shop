import { Suspense } from "react";

import AdminLoginForm from "@/components/admin/AdminLoginForm";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="admin-login-center">
          <div className="admin-login-card">
            <p className="admin-muted admin-m-0">Laden…</p>
          </div>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}

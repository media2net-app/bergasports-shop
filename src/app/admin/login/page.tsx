import { Suspense } from "react";

import AdminLoginForm from "@/components/admin/AdminLoginForm";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="admin-login-center">
          <p className="admin-muted">Loading…</p>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}

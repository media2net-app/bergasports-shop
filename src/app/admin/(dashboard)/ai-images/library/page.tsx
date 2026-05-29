import { Suspense } from "react";

import AdminAiGeneratedLibrary from "@/components/admin/AdminAiGeneratedLibrary";

export const dynamic = "force-dynamic";

export default function AdminAiImageLibraryPage() {
  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Generated images</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Browse AI outputs and install one as the main photo for a catalog product.
          </p>
        </div>
      </div>
      <Suspense fallback={<p className="admin-muted">Loading…</p>}>
        <AdminAiGeneratedLibrary />
      </Suspense>
    </div>
  );
}

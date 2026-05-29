"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminNewProductPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function create() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = (await res.json()) as { id?: number; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to create");
        setLoading(false);
        return;
      }
      if (typeof data.id === "number") {
        router.replace(`/admin/products/${data.id}`);
        return;
      }
      setError("No id returned");
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  return (
    <div className="admin-stack">
      <Link href="/admin/products" className="admin-breadcrumb">
        ← All products
      </Link>
      <h1 className="admin-h1">New product</h1>
      <div className="admin-panel-surface admin-stack-tight">
        <p className="admin-muted admin-m-0">
          An empty product template will be created. Then fill in all fields on the edit page.
        </p>
        {error ? <p className="admin-error-box admin-m-0">{error}</p> : null}
        <button type="button" disabled={loading} onClick={create} className="admin-btn-primary admin-w-fit">
          {loading ? "Working…" : "Create product"}
        </button>
      </div>
    </div>
  );
}

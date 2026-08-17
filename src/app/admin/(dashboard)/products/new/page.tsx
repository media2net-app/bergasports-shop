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
        setError(data.error ?? "Aanmaken mislukt");
        setLoading(false);
        return;
      }
      if (typeof data.id === "number") {
        router.replace(`/admin/products/${data.id}`);
        return;
      }
      setError("Geen product-ID ontvangen");
    } catch {
      setError("Geen verbinding");
    }
    setLoading(false);
  }

  return (
    <div className="admin-stack">
      <Link href="/admin/products" className="admin-breadcrumb">
        ← Alle producten
      </Link>
      <h1 className="admin-h1">Nieuw product</h1>
      <div className="admin-panel-surface admin-stack-tight">
        <p className="admin-muted admin-m-0">
          Er wordt een leeg product aangemaakt. Vul daarna alle velden in op de bewerkpagina.
        </p>
        {error ? <p className="admin-error-box admin-m-0">{error}</p> : null}
        <button type="button" disabled={loading} onClick={create} className="admin-btn-primary admin-w-fit">
          {loading ? "Bezig…" : "Product aanmaken"}
        </button>
      </div>
    </div>
  );
}

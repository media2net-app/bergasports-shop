"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const adminFetchInit: RequestInit = { credentials: "include", cache: "no-store" };

type GeneratedImage = {
  id: string;
  product_id: number | null;
  product_name: string | null;
  template_id: string;
  public_url: string;
  installed_at: string | null;
  created_at: string;
};

export default function AdminAiGeneratedLibrary() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("id");

  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai-images/generated?limit=80", adminFetchInit);
      const data = (await res.json()) as { images?: GeneratedImage[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setImages(data.images ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(
    () =>
      [...images].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [images],
  );

  const installAsMain = async (img: GeneratedImage) => {
    if (!img.product_id) {
      setError("No catalog product linked — generate from a Ralex product to install as main image.");
      return;
    }
    if (!window.confirm(`Set as main image for product #${img.product_id}?`)) return;

    setBusyId(img.id);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/ai-images/generated/${img.id}/install`, {
        ...adminFetchInit,
        method: "POST",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; productEditUrl?: string };
      if (!res.ok) throw new Error(data.error ?? "Install failed");
      setMsg(`Installed as main product image.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Install failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="admin-stack">
      {error ? (
        <div className="admin-banner err admin-m-0" role="alert">
          {error}
        </div>
      ) : null}
      {msg ? (
        <div className="admin-banner ok admin-m-0" role="status">
          {msg}
        </div>
      ) : null}

      <div className="admin-panel admin-stack-tight">
        <p className="admin-muted admin-m-0">
          All AI-generated images. Use <strong>Install as main</strong> to replace the catalog product&apos;s
          primary photo (shop + admin).
        </p>
        <Link href="/admin/ai-images" className="admin-link-action">
          ← Back to Generate
        </Link>
      </div>

      {loading ? (
        <p className="admin-muted">Loading…</p>
      ) : sorted.length === 0 ? (
        <div className="admin-panel">
          <p className="admin-muted admin-m-0">No generated images yet. Create one on the Generate page.</p>
        </div>
      ) : (
        <ul className="admin-ai-library-grid">
          {sorted.map((img) => {
            const active = highlightId === img.id;
            const installed = Boolean(img.installed_at);
            return (
              <li
                key={img.id}
                className={`admin-ai-library-card${active ? " admin-ai-library-card--active" : ""}`}
              >
                <div className="admin-ai-library-thumb">
                  <Image
                    src={img.public_url}
                    alt=""
                    width={400}
                    height={400}
                    className="admin-ai-images-img"
                    unoptimized
                  />
                </div>
                <div className="admin-ai-library-meta">
                  <span className="admin-ai-library-title">
                    {img.product_name ?? "Upload only"}
                    {installed ? (
                      <span className="admin-ai-library-badge">Installed</span>
                    ) : null}
                  </span>
                  <span className="admin-ai-library-sub">
                    {new Date(img.created_at).toLocaleString()} · {img.template_id}
                  </span>
                  {img.product_id ? (
                    <Link href={`/admin/products/${img.product_id}`} className="admin-link-action">
                      Product #{img.product_id}
                    </Link>
                  ) : null}
                </div>
                <div className="admin-ai-library-actions">
                  {img.product_id ? (
                    <button
                      type="button"
                      className="admin-btn-primary"
                      disabled={busyId === img.id || installed}
                      onClick={() => void installAsMain(img)}
                    >
                      {installed ? "Main image" : busyId === img.id ? "Installing…" : "Install as main"}
                    </button>
                  ) : (
                    <span className="admin-muted admin-ai-library-na">No product link</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

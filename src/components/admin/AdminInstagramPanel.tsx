"use client";

import { useState } from "react";

import type { InstagramConnectionStatus } from "@/lib/instagram-types";

export default function AdminInstagramPanel({ initial }: { initial: InstagramConnectionStatus }) {
  const [status, setStatus] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initial.error ?? "");

  async function sync() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/instagram/sync", { method: "POST" });
      const data = (await res.json()) as { status?: InstagramConnectionStatus; error?: string };
      if (!res.ok || !data.status) {
        setError(data.error ?? "Koppelen mislukt");
      } else {
        setStatus(data.status);
        if (data.status.error) setError(data.status.error);
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  const live = status.source === "live" && status.postCount > 0;

  return (
    <div className="admin-panel admin-stack-tight">
      <div>
        <h2 className="admin-h2 admin-m-0">Feed op de homepage</h2>
        <p className="admin-muted admin-m-0 admin-mt-05">
          Recente posts van {status.handle} komen op de homepage. Zonder token tonen we eigen winkelfoto&apos;s
          die naar Instagram linken.
        </p>
      </div>
      <p className="admin-m-0">
        <span className="admin-badge-src">{live ? "Live Instagram" : status.configured ? "Token staat klaar" : "Nog niet gekoppeld"}</span>
        {status.fetchedAt ? (
          <span className="admin-muted" style={{ marginLeft: "0.75rem", fontSize: "0.85rem" }}>
            Laatst bijgewerkt {new Date(status.fetchedAt).toLocaleString("nl-NL")}
          </span>
        ) : null}
      </p>
      {status.posts.length ? (
        <div className="admin-instagram-thumbs">
          {status.posts.map((post) => (
            <a key={post.id} href={post.permalink} target="_blank" rel="noopener noreferrer" title={post.alt}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.imageUrl} alt={post.alt} />
            </a>
          ))}
        </div>
      ) : null}
      {error ? <div className="admin-error-box">{error}</div> : null}
      <button type="button" className="admin-btn-primary admin-w-fit" disabled={busy} onClick={() => void sync()}>
        {busy ? "Bezig…" : live ? "Feed verversen" : "Koppeling testen"}
      </button>
    </div>
  );
}

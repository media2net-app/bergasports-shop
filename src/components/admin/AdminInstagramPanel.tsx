"use client";

import { useState } from "react";

import AdminImageUploadButton from "@/components/admin/AdminImageUploadButton";
import {
  draftsFromInstagramPostsJson,
  INSTAGRAM_POST_LIMIT,
  serializeInstagramPosts,
} from "@/lib/instagram-shared";
import type { InstagramConnectionStatus, InstagramPostDraft } from "@/lib/instagram-types";

type Props = {
  initial: InstagramConnectionStatus;
  initialPostsJson: string;
};

function initialDrafts(postsJson: string, status: InstagramConnectionStatus): InstagramPostDraft[] {
  const fromJson = draftsFromInstagramPostsJson(postsJson);
  if (postsJson.trim() || !status.posts.length) return fromJson;
  return status.posts.map((post) => ({
    permalink: post.permalink,
    imageUrl: post.imageUrl,
    caption: post.caption ?? "",
  }));
}

function sourceLabel(status: InstagramConnectionStatus): string {
  if (status.source === "live" && status.postCount > 0) return "Live Graph-feed";
  if (status.source === "curated" && status.postCount > 0) return "Handmatige berichten";
  if (status.source === "cache" && status.postCount > 0) return "Gecachte berichten";
  if (status.configured) return "Token klaar — nog niet gesynchroniseerd";
  return "Geen berichten (token of handmatig nodig)";
}

export default function AdminInstagramPanel({ initial, initialPostsJson }: Props) {
  const [status, setStatus] = useState(initial);
  const [drafts, setDrafts] = useState<InstagramPostDraft[]>(() => initialDrafts(initialPostsJson, initial));
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(initial.error ?? "");
  const [message, setMessage] = useState("");

  function updateDraft(index: number, patch: Partial<InstagramPostDraft>) {
    setDrafts((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addDraft() {
    setDrafts((prev) =>
      prev.length >= INSTAGRAM_POST_LIMIT ? prev : [...prev, { permalink: "", imageUrl: "", caption: "" }],
    );
  }

  function removeDraft(index: number) {
    setDrafts((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [{ permalink: "", imageUrl: "", caption: "" }];
    });
  }

  async function syncFeed() {
    setSyncing(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/instagram/sync", { method: "POST" });
      const data = (await res.json()) as { status?: InstagramConnectionStatus; error?: string };
      if (!res.ok || !data.status) {
        setError(data.error ?? "Ophalen mislukt");
      } else {
        setStatus(data.status);
        if (data.status.error) setError(data.status.error);
        else if (data.status.source === "live") {
          setMessage("Laatste berichten opgehaald. Ze staan in de homepage-grid.");
        }
      }
    } catch {
      setError("Geen verbinding");
    }
    setSyncing(false);
  }

  async function savePosts() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: { INSTAGRAM_POSTS_JSON: serializeInstagramPosts(drafts) } }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Opslaan mislukt");
      } else {
        setMessage("Handmatige berichten opgeslagen (gebruikt als er geen live Graph-feed is).");
        setStatus((prev) => ({
          ...prev,
          source: "curated",
          postCount: drafts.filter((d) => d.imageUrl.trim()).length,
        }));
      }
    } catch {
      setError("Geen verbinding");
    }
    setSaving(false);
  }

  return (
    <div className="admin-panel admin-stack-tight">
      <div>
        <h2 className="admin-h2 admin-m-0">Follow Bergasports op de homepage</h2>
        <p className="admin-muted admin-m-0 admin-mt-05">
          De homepage toont een eigen foto-grid (geen Instagram-iframe). Voor automatisch de laatste
          berichten: zet hierboven een optionele Graph-token en klik op ophalen. Zonder token: vul
          hieronder handmatig tot {INSTAGRAM_POST_LIMIT} berichten in (foto + Instagram-link).
        </p>
      </div>

      <p className="admin-m-0">
        <span className="admin-badge-src">{sourceLabel(status)}</span>
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

      <div className="admin-row" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className="admin-btn-primary admin-w-fit"
          disabled={syncing || !status.configured}
          onClick={() => void syncFeed()}
          title={status.configured ? undefined : "Eerst een Instagram Access Token opslaan hierboven"}
        >
          {syncing ? "Bezig…" : "Laatste berichten ophalen"}
        </button>
        <a href={status.profileUrl} target="_blank" rel="noopener noreferrer" className="admin-btn-secondary">
          Open {status.handle}
        </a>
      </div>

      <div style={{ borderTop: "1px solid var(--admin-border, #e5dcc8)", paddingTop: "1rem" }}>
        <h3 className="admin-h2 admin-m-0" style={{ fontSize: "1rem" }}>
          Fallback: handmatige grid
        </h3>
        <p className="admin-muted admin-m-0 admin-mt-05">
          Gebruikt als er geen Graph-token is of sync mislukt. Live Graph-feed heeft voorrang.
        </p>
      </div>

      {drafts.map((row, index) => (
        <div
          key={`ig-post-${index}`}
          className="admin-stack-tight"
          style={{
            borderTop: index ? "1px solid var(--admin-border, #e5dcc8)" : undefined,
            paddingTop: index ? "1rem" : 0,
          }}
        >
          <div className="admin-settings-form-grid">
            <label className="admin-settings-field is-wide">
              <span className="admin-settings-field-label">Instagram-link</span>
              <input
                className="admin-field admin-field--flush"
                value={row.permalink}
                onChange={(e) => updateDraft(index, { permalink: e.target.value })}
                placeholder="https://www.instagram.com/p/…/"
              />
            </label>
            <label className="admin-settings-field is-wide">
              <span className="admin-settings-field-label">Afbeelding-URL</span>
              <input
                className="admin-field admin-field--flush"
                value={row.imageUrl}
                onChange={(e) => updateDraft(index, { imageUrl: e.target.value })}
                placeholder="https://… of upload hieronder"
              />
            </label>
            <label className="admin-settings-field is-wide">
              <span className="admin-settings-field-label">Bijschrift (optioneel)</span>
              <input
                className="admin-field admin-field--flush"
                value={row.caption}
                onChange={(e) => updateDraft(index, { caption: e.target.value })}
                placeholder="Korte tekst onder hover"
              />
            </label>
          </div>
          <div className="admin-row" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            <AdminImageUploadButton
              label="Upload foto"
              folder="uploads"
              onUploaded={(url, alt) =>
                updateDraft(index, {
                  imageUrl: url,
                  caption: row.caption || (alt?.trim() ?? ""),
                })
              }
              onError={setError}
            />
            {row.imageUrl ? (
              <a href={row.permalink || status.profileUrl} target="_blank" rel="noopener noreferrer" title={row.caption || "Preview"}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={row.imageUrl}
                  alt={row.caption || "Instagram-voorbeeld"}
                  style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, display: "block" }}
                />
              </a>
            ) : null}
            {drafts.length > 1 ? (
              <button type="button" className="admin-btn-secondary admin-w-fit" onClick={() => removeDraft(index)}>
                Bericht verwijderen
              </button>
            ) : null}
          </div>
        </div>
      ))}

      {error ? <div className="admin-error-box">{error}</div> : null}
      {message ? (
        <div className="admin-banner ok admin-m-0" role="status">
          {message}
        </div>
      ) : null}

      <div className="admin-row" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className="admin-btn-secondary admin-w-fit"
          disabled={drafts.length >= INSTAGRAM_POST_LIMIT}
          onClick={addDraft}
        >
          Bericht toevoegen
        </button>
        <button type="button" className="admin-btn-secondary admin-w-fit" disabled={saving} onClick={() => void savePosts()}>
          {saving ? "Bezig…" : "Handmatige berichten opslaan"}
        </button>
      </div>
    </div>
  );
}

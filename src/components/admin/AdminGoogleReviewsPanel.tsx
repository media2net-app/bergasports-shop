"use client";

import { useState } from "react";

import DateTimePicker from "@/components/ui/DateTimePicker";
import GoldStars from "@/components/ui/GoldStars";
import { draftsFromFeaturedJson, serializeFeaturedReviews } from "@/lib/google-reviews-shared";
import type { FeaturedReviewDraft, GoogleReviewsConnectionStatus } from "@/lib/google-reviews-types";

type Props = {
  initial: GoogleReviewsConnectionStatus;
  initialFeaturedJson: string;
};

export default function AdminGoogleReviewsPanel({ initial, initialFeaturedJson }: Props) {
  const [status, setStatus] = useState(initial);
  const [drafts, setDrafts] = useState<FeaturedReviewDraft[]>(() => draftsFromFeaturedJson(initialFeaturedJson));
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(initial.error ?? "");
  const [message, setMessage] = useState("");

  async function sync() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/google-reviews/sync", { method: "POST" });
      const data = (await res.json()) as { status?: GoogleReviewsConnectionStatus; error?: string };
      if (!res.ok || !data.status) {
        setError(data.error ?? "Koppelen mislukt");
      } else {
        setStatus(data.status);
        if (data.status.error) setError(data.status.error);
        else setMessage("Google-reviews bijgewerkt.");
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  function updateDraft(index: number, patch: Partial<FeaturedReviewDraft>) {
    setDrafts((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addDraft() {
    setDrafts((prev) => (prev.length >= 6 ? prev : [...prev, { name: "", stars: 5, text: "", date: "" }]));
  }

  function removeDraft(index: number) {
    setDrafts((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [{ name: "", stars: 5, text: "", date: "" }];
    });
  }

  async function saveQuotes() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: { GOOGLE_REVIEWS_FEATURED_JSON: serializeFeaturedReviews(drafts) } }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Opslaan mislukt");
      } else {
        setMessage("Uitgelichte citaten opgeslagen.");
      }
    } catch {
      setError("Geen verbinding");
    }
    setSaving(false);
  }

  const live = status.source === "live" && (status.quotes.length > 0 || Boolean(status.rating));

  return (
    <div className="admin-stack">
      <div className="admin-panel admin-stack-tight">
        <div>
          <h2 className="admin-h2 admin-m-0">Live Google-reviews</h2>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Met een Places API-key haalt de homepage echte reviews en de score op. Zonder key blijft de
            sectie staan met een knop naar Google, plus eventuele citaten hieronder.
          </p>
        </div>
        <p className="admin-m-0">
          <span className="admin-badge-src">
            {live ? "Live Google" : status.configured ? "Key staat klaar" : "Nog niet gekoppeld"}
          </span>
          {status.fetchedAt ? (
            <span className="admin-muted" style={{ marginLeft: "0.75rem", fontSize: "0.85rem" }}>
              Laatst bijgewerkt {new Date(status.fetchedAt).toLocaleString("nl-NL")}
            </span>
          ) : null}
        </p>
        {status.rating ? (
          <p className="admin-m-0">
            Score {status.rating.toLocaleString("nl-NL", { maximumFractionDigits: 1 })}
            {status.reviewCount ? ` · ${status.reviewCount} beoordelingen` : ""}
          </p>
        ) : null}
        {status.quotes.length ? (
          <ul className="admin-stack-tight admin-m-0">
            {status.quotes.map((quote) => (
              <li key={quote.id} className="admin-muted" style={{ fontSize: "0.9rem" }}>
                <strong>{quote.author}</strong> — {quote.text.slice(0, 140)}
                {quote.text.length > 140 ? "…" : ""}
              </li>
            ))}
          </ul>
        ) : null}
        {error ? <div className="admin-error-box">{error}</div> : null}
        {message ? (
          <div className="admin-banner ok admin-m-0" role="status">
            {message}
          </div>
        ) : null}
        <div className="admin-row" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button type="button" className="admin-btn-primary admin-w-fit" disabled={busy} onClick={() => void sync()}>
            {busy ? "Bezig…" : live ? "Reviews verversen" : "Koppeling testen"}
          </button>
          <a href={status.reviewsUrl} target="_blank" rel="noopener noreferrer" className="admin-btn-secondary">
            Open Google-reviews
          </a>
        </div>
      </div>

      <div className="admin-panel admin-stack-tight">
        <div>
          <h2 className="admin-h2 admin-m-0">Uitgelichte citaten</h2>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Optioneel, als de Places API geen teksten teruggeeft. We tonen ze als “klanten over Bergasports”,
            niet als live Google-data. Plak alleen echte klantreacties.
          </p>
        </div>
        {drafts.map((row, index) => (
          <div key={`quote-${index}`} className="admin-stack-tight" style={{ borderTop: index ? "1px solid var(--admin-border, #e5dcc8)" : undefined, paddingTop: index ? "1rem" : 0 }}>
            <div className="admin-settings-form-grid">
              <label className="admin-settings-field">
                <span className="admin-settings-field-label">Naam</span>
                <input
                  className="admin-field admin-field--flush"
                  value={row.name}
                  onChange={(e) => updateDraft(index, { name: e.target.value })}
                  placeholder="Voornaam of initialen"
                />
              </label>
              <label className="admin-settings-field">
                <span className="admin-settings-field-label">Sterren</span>
                <select
                  className="admin-field admin-field--flush"
                  value={row.stars}
                  onChange={(e) => updateDraft(index, { stars: Number(e.target.value) })}
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span className="admin-mt-05">
                  <GoldStars rating={row.stars} size="sm" />
                </span>
              </label>
              <div className="admin-settings-field is-wide">
                <span className="admin-settings-field-label">Datum (optioneel)</span>
                <DateTimePicker
                  variant="admin"
                  mode="date"
                  value={row.date}
                  onChange={(date) => updateDraft(index, { date })}
                  placeholder="Datum"
                />
              </div>
              <label className="admin-settings-field is-wide">
                <span className="admin-settings-field-label">Citaat</span>
                <textarea
                  className="admin-field admin-field--flush"
                  rows={3}
                  value={row.text}
                  onChange={(e) => updateDraft(index, { text: e.target.value })}
                  placeholder="Korte, echte klantreactie"
                />
              </label>
            </div>
            {drafts.length > 1 ? (
              <button type="button" className="admin-btn-secondary admin-w-fit" onClick={() => removeDraft(index)}>
                Citaat verwijderen
              </button>
            ) : null}
          </div>
        ))}
        <div className="admin-row" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button type="button" className="admin-btn-secondary admin-w-fit" disabled={drafts.length >= 6} onClick={addDraft}>
            Citaat toevoegen
          </button>
          <button type="button" className="admin-btn-primary admin-w-fit" disabled={saving} onClick={() => void saveQuotes()}>
            {saving ? "Opslaan…" : "Citaten opslaan"}
          </button>
        </div>
      </div>
    </div>
  );
}

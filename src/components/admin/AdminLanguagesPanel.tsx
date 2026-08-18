"use client";

import { useMemo, useState } from "react";

import type { LocaleCatalogEntry } from "@/lib/i18n/locale-codes";
import type { ShopLanguage } from "@/lib/i18n/shop-language-types";

type Props = {
  initialLanguages: ShopLanguage[];
  catalog: LocaleCatalogEntry[];
};

export default function AdminLanguagesPanel({ initialLanguages, catalog }: Props) {
  const [languages, setLanguages] = useState(initialLanguages);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [addCode, setAddCode] = useState(catalog[0]?.code ?? "en");

  const unused = useMemo(() => {
    const have = new Set(languages.map((row) => row.code));
    return catalog.filter((row) => !have.has(row.code));
  }, [catalog, languages]);

  async function refresh() {
    const res = await fetch("/api/admin/languages");
    const data = (await res.json()) as { languages?: ShopLanguage[]; error?: string };
    if (!res.ok) throw new Error(data.error ?? "Kon talen niet laden");
    if (data.languages) setLanguages(data.languages);
  }

  async function addLanguage() {
    if (!addCode) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/languages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: addCode }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Toevoegen mislukt");
      await refresh();
      const nextUnused = catalog.filter((row) => row.code !== addCode && !languages.some((l) => l.code === row.code));
      setAddCode(nextUnused[0]?.code ?? "");
      setMessage("Taal toegevoegd. Vul vertalingen in bij producten, categorieën, pagina’s, nieuws en e-mails.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Toevoegen mislukt");
    }
    setBusy(false);
  }

  async function patch(code: string, body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/languages/${encodeURIComponent(code)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Bijwerken mislukt");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bijwerken mislukt");
    }
    setBusy(false);
  }

  async function remove(code: string) {
    if (!window.confirm(`Taal “${code}” verwijderen? Bestaande vertalingen blijven in de database staan.`)) {
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/languages/${encodeURIComponent(code)}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Verwijderen mislukt");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verwijderen mislukt");
    }
    setBusy(false);
  }

  return (
    <div className="admin-stack">
      <div>
        <h2 className="admin-h2 admin-m-0">Talen</h2>
        <p className="admin-muted admin-m-0 admin-mt-05">
          Standaardtaal is Nederlands (URLs zonder prefix: <code>/</code>). Extra talen krijgen{" "}
          <code>/en/…</code>, <code>/de/…</code>, enzovoort. <code>/nl/…</code> gaat met een 301 naar de
          versie zonder prefix. Een taalschakelaar in de shop verschijnt pas als minstens twee talen aan
          staan. Vertalingen vul je zelf in op elk onderdeel — er wordt niets automatisch vertaald.
        </p>
      </div>

      {message ? (
        <div className="admin-banner ok admin-m-0" role="status">
          {message}
        </div>
      ) : null}
      {error ? <div className="admin-error-box">{error}</div> : null}

      <div className="admin-panel-surface admin-stack-tight">
        <h3 className="admin-section-title">Actieve talen</h3>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Naam</th>
                <th>Aan</th>
                <th>Standaard</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {languages.map((lang) => (
                <tr key={lang.code}>
                  <td>
                    <code>{lang.code}</code>
                  </td>
                  <td>
                    {lang.name}
                    {lang.nativeName !== lang.name ? (
                      <span className="admin-muted"> · {lang.nativeName}</span>
                    ) : null}
                  </td>
                  <td>
                    <label className="admin-check-highlight" style={{ display: "inline-flex" }}>
                      <input
                        type="checkbox"
                        checked={lang.enabled}
                        disabled={busy || lang.isDefault}
                        onChange={(e) => void patch(lang.code, { enabled: e.target.checked })}
                      />
                      {lang.enabled ? "Aan" : "Uit"}
                    </label>
                  </td>
                  <td>
                    <label className="admin-check-highlight" style={{ display: "inline-flex" }}>
                      <input
                        type="radio"
                        name="default-locale"
                        checked={lang.isDefault}
                        disabled={busy}
                        onChange={() => void patch(lang.code, { isDefault: true })}
                      />
                      {lang.isDefault ? "Ja" : ""}
                    </label>
                  </td>
                  <td>
                    {lang.code === "nl" ? (
                      <span className="admin-muted">vast</span>
                    ) : (
                      <button
                        type="button"
                        className="admin-btn-danger admin-btn-danger--sm"
                        disabled={busy || lang.isDefault}
                        onClick={() => void remove(lang.code)}
                      >
                        Weg
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-panel-surface admin-stack-tight">
        <h3 className="admin-section-title">Taal toevoegen</h3>
        {unused.length ? (
          <div className="admin-form-grid">
            <label className="admin-label">
              Taal
              <select
                className="admin-field"
                value={addCode}
                onChange={(e) => setAddCode(e.target.value)}
                disabled={busy}
              >
                {unused.map((row) => (
                  <option key={row.code} value={row.code}>
                    {row.name} ({row.nativeName}) — {row.code}
                  </option>
                ))}
              </select>
            </label>
            <div className="admin-form-actions" style={{ alignSelf: "end" }}>
              <button type="button" className="admin-btn-primary" disabled={busy || !addCode} onClick={() => void addLanguage()}>
                {busy ? "…" : "Toevoegen"}
              </button>
            </div>
          </div>
        ) : (
          <p className="admin-muted admin-m-0">Alle talen uit de lijst staan er al in.</p>
        )}
      </div>
    </div>
  );
}

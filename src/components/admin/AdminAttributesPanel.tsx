"use client";

import { Fragment, useMemo, useState } from "react";

import type { ShopAttribute, ShopAttributeTerm } from "@/lib/attributes-shared";
import { attributeSlugFromName, attributeTermSlugFromName } from "@/lib/attributes-shared";

type Props = {
  initialAttributes: ShopAttribute[];
};

export default function AdminAttributesPanel({ initialAttributes }: Props) {
  const [attributes, setAttributes] = useState(initialAttributes);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [newTermByAttr, setNewTermByAttr] = useState<Record<number, string>>({});

  const termCount = useMemo(
    () => attributes.reduce((sum, attr) => sum + attr.terms.length, 0),
    [attributes],
  );

  async function createAttribute() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/attributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slug.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { attribute?: ShopAttribute; error?: string };
      if (!res.ok || !data.attribute) {
        setError(data.error ?? "Aanmaken mislukt");
        setBusy(false);
        return;
      }
      setAttributes((prev) =>
        [...prev, data.attribute!].sort((a, b) => a.name.localeCompare(b.name, "nl")),
      );
      setName("");
      setSlug("");
      setSlugTouched(false);
      setExpandedId(data.attribute.id);
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  async function patchAttribute(id: number, body: Record<string, unknown>) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/attributes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { attribute?: ShopAttribute; error?: string };
      if (!res.ok || !data.attribute) {
        setError(data.error ?? "Bijwerken mislukt");
      } else {
        setAttributes((prev) => prev.map((a) => (a.id === id ? data.attribute! : a)));
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  async function removeAttribute(attr: ShopAttribute) {
    if (!window.confirm(`Attribuut “${attr.name}” en alle termen verwijderen?`)) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/attributes/${attr.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Verwijderen mislukt");
      } else {
        setAttributes((prev) => prev.filter((a) => a.id !== attr.id));
        if (expandedId === attr.id) setExpandedId(null);
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  async function addTerm(attributeId: number) {
    const termName = (newTermByAttr[attributeId] ?? "").trim();
    if (!termName) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/attributes/${attributeId}/terms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: termName }),
      });
      const data = (await res.json()) as { term?: ShopAttributeTerm; error?: string };
      if (!res.ok || !data.term) {
        setError(data.error ?? "Term toevoegen mislukt");
      } else {
        setAttributes((prev) =>
          prev.map((a) =>
            a.id === attributeId
              ? {
                  ...a,
                  terms: [...a.terms, data.term!].sort(
                    (x, y) => x.menuOrder - y.menuOrder || x.name.localeCompare(y.name, "nl"),
                  ),
                }
              : a,
          ),
        );
        setNewTermByAttr((prev) => ({ ...prev, [attributeId]: "" }));
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  async function patchTerm(attributeId: number, termId: number, body: Record<string, unknown>) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/attributes/${attributeId}/terms/${termId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { term?: ShopAttributeTerm; error?: string };
      if (!res.ok || !data.term) {
        setError(data.error ?? "Term bijwerken mislukt");
      } else {
        setAttributes((prev) =>
          prev.map((a) =>
            a.id === attributeId
              ? { ...a, terms: a.terms.map((t) => (t.id === termId ? data.term! : t)) }
              : a,
          ),
        );
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  async function removeTerm(attributeId: number, term: ShopAttributeTerm) {
    if (!window.confirm(`Term “${term.name}” verwijderen?`)) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/attributes/${attributeId}/terms/${term.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Term verwijderen mislukt");
      } else {
        setAttributes((prev) =>
          prev.map((a) =>
            a.id === attributeId ? { ...a, terms: a.terms.filter((t) => t.id !== term.id) } : a,
          ),
        );
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  return (
    <div className="admin-stack">
      {error ? <div className="admin-error-box">{error}</div> : null}

      <form
        className="admin-settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          void createAttribute();
        }}
      >
        <header className="admin-settings-form-head">
          <div>
            <h2 className="admin-settings-form-title">Nieuw attribuut</h2>
            <p className="admin-settings-form-intro">
              {attributes.length} globale eigenschappen · {termCount} termen. Worden ook gevuld via
              WooCommerce-import (producten of eigenschappen).
            </p>
          </div>
        </header>
        <div className="admin-settings-form-grid">
          <div className="admin-settings-field">
            <label className="admin-settings-field-label" htmlFor="attr-name">
              Naam
            </label>
            <input
              id="attr-name"
              className="admin-field admin-field--flush"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(attributeSlugFromName(e.target.value));
              }}
              placeholder="Kleur"
              required
            />
          </div>
          <div className="admin-settings-field">
            <label className="admin-settings-field-label" htmlFor="attr-slug">
              Slug
            </label>
            <input
              id="attr-slug"
              className="admin-field admin-field--flush"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(attributeSlugFromName(e.target.value) || e.target.value);
              }}
              placeholder="pa_kleur"
            />
          </div>
        </div>
        <footer className="admin-settings-form-foot">
          <button type="submit" className="admin-btn-primary" disabled={busy || !name.trim()}>
            {busy ? "Bezig…" : "Attribuut toevoegen"}
          </button>
        </footer>
      </form>

      <div className="admin-panel-surface admin-stack-tight">
        <h3 className="admin-section-title">Eigenschappen</h3>
        {attributes.length === 0 ? (
          <p className="admin-muted admin-m-0">
            Nog geen attributen. Voeg er een toe, of draai WooCommerce-import (producten of
            eigenschappen).
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Naam</th>
                  <th>Slug</th>
                  <th>Termen</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {attributes.map((attr) => {
                  const open = expandedId === attr.id;
                  return (
                    <Fragment key={attr.id}>
                      <tr>
                        <td>
                          <input
                            className="admin-field"
                            defaultValue={attr.name}
                            aria-label={`Naam ${attr.name}`}
                            onBlur={(e) => {
                              const next = e.target.value.trim();
                              if (next && next !== attr.name) void patchAttribute(attr.id, { name: next });
                            }}
                          />
                        </td>
                        <td>
                          <code>{attr.slug}</code>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="admin-link-action"
                            onClick={() => setExpandedId(open ? null : attr.id)}
                          >
                            {attr.terms.length} {open ? "verbergen" : "tonen"}
                          </button>
                        </td>
                        <td className="admin-td-right">
                          <button
                            type="button"
                            className="admin-link-action"
                            disabled={busy}
                            onClick={() => void removeAttribute(attr)}
                          >
                            Verwijderen
                          </button>
                        </td>
                      </tr>
                      {open ? (
                        <tr>
                          <td colSpan={4}>
                            <div className="admin-stack-tight" style={{ padding: "0.5rem 0" }}>
                              {attr.terms.length === 0 ? (
                                <p className="admin-muted admin-m-0">Nog geen termen.</p>
                              ) : (
                                <ul className="admin-m-0" style={{ listStyle: "none", padding: 0 }}>
                                  {attr.terms.map((term) => (
                                    <li
                                      key={term.id}
                                      style={{
                                        display: "flex",
                                        gap: "0.75rem",
                                        alignItems: "center",
                                        marginBottom: "0.35rem",
                                      }}
                                    >
                                      <input
                                        className="admin-field"
                                        defaultValue={term.name}
                                        aria-label={`Term ${term.name}`}
                                        onBlur={(e) => {
                                          const next = e.target.value.trim();
                                          if (next && next !== term.name) {
                                            void patchTerm(attr.id, term.id, { name: next });
                                          }
                                        }}
                                      />
                                      <code style={{ flexShrink: 0 }}>{term.slug}</code>
                                      <button
                                        type="button"
                                        className="admin-link-action"
                                        disabled={busy}
                                        onClick={() => void removeTerm(attr.id, term)}
                                      >
                                        Verwijderen
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <form
                                style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  void addTerm(attr.id);
                                }}
                              >
                                <input
                                  className="admin-field"
                                  value={newTermByAttr[attr.id] ?? ""}
                                  onChange={(e) =>
                                    setNewTermByAttr((prev) => ({ ...prev, [attr.id]: e.target.value }))
                                  }
                                  placeholder={`Nieuwe term (bv. ${attributeTermSlugFromName("rood")})`}
                                />
                                <button
                                  type="submit"
                                  className="admin-btn-primary"
                                  disabled={busy || !(newTermByAttr[attr.id] ?? "").trim()}
                                >
                                  Term toevoegen
                                </button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

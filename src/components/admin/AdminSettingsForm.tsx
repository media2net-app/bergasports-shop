"use client";

import { useState, type FormEvent } from "react";

import AdminMoneyInput from "@/components/admin/AdminMoneyInput";
import { formatMoneyInput } from "@/lib/money-input";
import type { AdminSettingFieldView } from "@/lib/site-settings-defs";
import { getSettingGroup } from "@/lib/site-settings-defs";

type AdminSettingsFormProps = {
  groupId: string;
  initialFields: AdminSettingFieldView[];
};

function fieldIsWide(field: AdminSettingFieldView): boolean {
  if (field.multiline || field.secret) return true;
  return /URL|ADDRESS|FROM|HOST|TOKEN/i.test(field.key);
}

function fieldIsMoney(field: AdminSettingFieldView): boolean {
  return field.key === "NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_EUR";
}

export default function AdminSettingsForm({ groupId, initialFields }: AdminSettingsFormProps) {
  const group = getSettingGroup(groupId);
  const [fields, setFields] = useState(initialFields);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const f of initialFields) {
      const raw = f.secret ? "" : f.displayValue;
      next[f.key] = fieldIsMoney(f) ? formatMoneyInput(raw, { allowEmpty: true }) : raw;
    }
    return next;
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!group) {
    return <p className="admin-error-box">Onbekende instellingengroep.</p>;
  }

  function setDraft(key: string, value: string) {
    setDrafts((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    const values: Record<string, string> = {};
    for (const f of fields) {
      values[f.key] = drafts[f.key] ?? "";
    }
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        saved?: string[];
        fields?: AdminSettingFieldView[];
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Opslaan mislukt");
        setSaving(false);
        return;
      }
      if (data.fields) {
        const next = data.fields.filter((f) => f.group === groupId && !f.hidden);
        setFields(next);
        setDrafts((prev) => {
          const merged = { ...prev };
          for (const f of next) {
            const raw = f.secret ? "" : f.displayValue;
            merged[f.key] = fieldIsMoney(f) ? formatMoneyInput(raw, { allowEmpty: true }) : raw;
          }
          return merged;
        });
      }
      const n = data.saved?.length ?? 0;
      setMessage(
        n > 0
          ? `${n} waarde(n) opgeslagen.`
          : "Geen wijzigingen (geheimen ongewijzigd laten = leeg laten).",
      );
    } catch {
      setError("Netwerkfout");
    }
    setSaving(false);
  }

  return (
    <form className="admin-settings-form" onSubmit={(e) => void onSubmit(e)}>
      <header className="admin-settings-form-head">
        <div>
          <h2 className="admin-settings-form-title">{group.title}</h2>
          <p className="admin-settings-form-intro">{group.intro}</p>
        </div>
      </header>

      {message ? (
        <div className="admin-banner ok admin-m-0" role="status">
          {message}
        </div>
      ) : null}
      {error ? <div className="admin-error-box">{error}</div> : null}

      <div className="admin-settings-form-grid">
        {fields.map((field) => {
          const inputId = `setting-${field.key}`;
          const placeholder = field.secret
            ? field.configured
              ? "Laat leeg om de huidige waarde te behouden"
              : field.placeholder
            : field.placeholder;
          const links = field.manual.links ?? [];
          return (
            <div
              key={field.key}
              className={`admin-settings-field${fieldIsWide(field) ? " is-wide" : ""}`}
            >
              <div className="admin-settings-field-labelrow">
                <label className="admin-settings-field-label" htmlFor={inputId}>
                  {field.label}
                </label>
                {field.secret && field.configured ? (
                  <span className="admin-settings-field-meta">Huidig: {field.displayValue}</span>
                ) : null}
              </div>

              {field.multiline ? (
                <textarea
                  id={inputId}
                  className="admin-field admin-field--flush"
                  rows={3}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={placeholder}
                  value={drafts[field.key] ?? ""}
                  onChange={(e) => setDraft(field.key, e.target.value)}
                />
              ) : fieldIsMoney(field) ? (
                <AdminMoneyInput
                  id={inputId}
                  className="admin-field admin-field--flush"
                  allowEmpty
                  placeholder={placeholder}
                  value={drafts[field.key] ?? ""}
                  onChange={(value) => setDraft(field.key, value)}
                />
              ) : (
                <input
                  id={inputId}
                  className="admin-field admin-field--flush"
                  type={field.secret ? "password" : "text"}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={placeholder}
                  value={drafts[field.key] ?? ""}
                  onChange={(e) => setDraft(field.key, e.target.value)}
                />
              )}

              {links.length > 0 ? (
                <p className="admin-settings-field-hint">
                  {links.map((link, i) => (
                    <span key={link.href}>
                      {i > 0 ? " · " : null}
                      <a href={link.href} target="_blank" rel="noopener noreferrer">
                        {link.label}
                      </a>
                    </span>
                  ))}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <footer className="admin-settings-form-foot">
        <button type="submit" className="admin-btn-primary" disabled={saving}>
          {saving ? "Opslaan…" : "Opslaan"}
        </button>
        <p className="admin-muted admin-m-0">
          Geheimen (API-keys): leeg laten behoudt de huidige waarde.
        </p>
      </footer>
    </form>
  );
}

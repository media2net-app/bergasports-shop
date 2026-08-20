"use client";

import { useState, type FormEvent } from "react";

import AdminMoneyInput from "@/components/admin/AdminMoneyInput";
import { formatMoneyInput } from "@/lib/money-input";
import type { AdminSettingFieldView } from "@/lib/site-settings-defs";
import { getSettingGroup, isMaskedSecretInput } from "@/lib/site-settings-defs";

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
      // Secrets always start blank so we never re-submit a mask and wipe/skip silently.
      const raw = f.secret ? "" : f.displayValue;
      next[f.key] = fieldIsMoney(f) ? formatMoneyInput(raw, { allowEmpty: true }) : raw;
    }
    return next;
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
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
      const draft = drafts[f.key] ?? "";
      if (f.secret) {
        // Never send blank or masked placeholders — server keeps the existing secret.
        if (!draft.trim() || isMaskedSecretInput(draft)) {
          continue;
        }
        values[f.key] = draft.trim();
        continue;
      }
      values[f.key] = draft;
    }

    const openAiDraft = drafts.OPENAI_API_KEY?.trim() ?? "";
    if (groupId === "openai" && openAiDraft && isMaskedSecretInput(openAiDraft)) {
      setError(
        "Plak de echte sk-… key, niet het gemaskeerde ••••-voorbeeld. Leeg laten behoudt de huidige key.",
      );
      setSaving(false);
      return;
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
        cleared?: string[];
        skipped?: { key: string; reason: string }[];
        fields?: AdminSettingFieldView[];
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Opslaan mislukt");
        setSaving(false);
        return;
      }
      const nextFields = data.fields
        ? data.fields.filter((f) => f.group === groupId && !f.hidden)
        : fields;
      if (data.fields) {
        setFields(nextFields);
        setDrafts((prev) => {
          const merged = { ...prev };
          for (const f of nextFields) {
            const raw = f.secret ? "" : f.displayValue;
            merged[f.key] = fieldIsMoney(f) ? formatMoneyInput(raw, { allowEmpty: true }) : raw;
          }
          return merged;
        });
      }
      const n = data.saved?.length ?? 0;
      const cleared = data.cleared?.length ?? 0;
      const openAiReady = nextFields.some((f) => f.key === "OPENAI_API_KEY" && f.configured);
      const openAiSaved = data.saved?.includes("OPENAI_API_KEY");
      const openAiSkippedMask = data.skipped?.some(
        (s) => s.key === "OPENAI_API_KEY" && s.reason === "masked_placeholder",
      );

      if (groupId === "openai" && openAiDraft && !openAiSaved) {
        setError(
          openAiSkippedMask
            ? "OpenAI-key niet opgeslagen: het veld bevatte een masker (••••). Plak de echte sk-… key."
            : "OpenAI-key is niet in de database gezet. Plak sk-… en probeer opnieuw.",
        );
      } else if (n > 0) {
        setMessage(
          `${n} waarde(n) opgeslagen.${
            openAiReady || openAiSaved
              ? " OpenAI-key staat in de database — klaar voor foto-eendracht / AI-beelden."
              : ""
          }`,
        );
      } else if (cleared > 0) {
        setMessage(`${cleared} waarde(n) gewist.`);
      } else if (groupId === "openai" && openAiReady) {
        setMessage(
          "Geen wijzigingen — bestaande OpenAI-key behouden. Gebruik “Test OpenAI-verbinding” om te controleren.",
        );
      } else {
        setMessage(
          "Geen wijzigingen. Voor API-keys: plak de nieuwe sk-… waarde in het veld en klik Opslaan (leeg laten behoudt de oude key).",
        );
      }
    } catch {
      setError("Netwerkfout");
    }
    setSaving(false);
  }

  async function onTestOpenAi() {
    setError("");
    setMessage("");
    setTesting(true);
    try {
      const res = await fetch("/api/admin/openai/test", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        label?: string;
        detail?: string;
      };
      if (data.ok) {
        setMessage(`${data.label ?? "OK"}. ${data.detail ?? ""}`.trim());
      } else {
        setError(`${data.label ?? "Mislukt"}. ${data.detail ?? "Geen details."}`.trim());
      }
    } catch {
      setError("Netwerkfout bij OpenAI-test.");
    }
    setTesting(false);
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
                  <span className="admin-settings-field-meta">
                    Huidig: {field.displayValue}
                    {field.source === "database" ? " (database)" : field.source === "env" ? " (env)" : ""}
                  </span>
                ) : field.secret ? (
                  <span className="admin-settings-field-meta">Nog niet opgeslagen</span>
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
                  autoComplete={field.secret ? "new-password" : "off"}
                  data-1p-ignore={field.secret ? "true" : undefined}
                  data-lpignore={field.secret ? "true" : undefined}
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
        <button type="submit" className="admin-btn-primary" disabled={saving || testing}>
          {saving ? "Opslaan…" : "Opslaan"}
        </button>
        {groupId === "openai" ? (
          <button
            type="button"
            className="admin-btn-secondary"
            disabled={saving || testing}
            onClick={() => void onTestOpenAi()}
          >
            {testing ? "Testen…" : "Test OpenAI-verbinding"}
          </button>
        ) : null}
        <p className="admin-muted admin-m-0">
          Geheimen (API-keys): leeg laten behoudt de huidige waarde. Een nieuw sk-… plakken + Opslaan
          schrijft naar de database.
        </p>
      </footer>
    </form>
  );
}

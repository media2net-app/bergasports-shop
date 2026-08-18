"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import AdminHtmlEditor from "@/components/admin/AdminHtmlEditor";
import AdminLocaleTabs from "@/components/admin/AdminLocaleTabs";
import { useLocaleDraft } from "@/components/admin/useLocaleDraft";
import { EMAIL_PLACEHOLDERS, tokenMarkup, type EmailTemplateDraft } from "@/lib/email-template-defs";
import { hydrateEmailTranslations } from "@/lib/i18n/hydrate";
import type { EmailLocaleFields } from "@/lib/i18n/translations";

type Props = { template: EmailTemplateDraft };

export default function AdminEmailTemplateEditor({ template }: Props) {
  const {
    locale: editLocale,
    setLocale: setEditLocale,
    languages,
    fields: loc,
    setField: setLoc,
    compact,
    filled,
    setMap,
  } = useLocaleDraft<EmailLocaleFields>(hydrateEmailTranslations(template));
  const subject = loc.subject ?? "";
  const title = loc.title ?? "";
  const bodyHtml = loc.bodyHtml ?? "";
  const [error, setError] = useState("");
  const [saveOk, setSaveOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState(template.subject);
  const previewSeq = useRef(0);

  useEffect(() => {
    const seq = (previewSeq.current += 1);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/admin/email-templates/preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: template.key, subject, title, bodyHtml }),
          });
          const data = (await res.json()) as { html?: string; subject?: string; error?: string };
          if (seq !== previewSeq.current) return;
          if (!res.ok) {
            setError(data.error ?? "Voorbeeld laden mislukt");
            return;
          }
          setPreviewHtml(data.html ?? "");
          setPreviewSubject(data.subject ?? subject);
        } catch {
          if (seq === previewSeq.current) setError("Geen verbinding voor voorbeeld");
        }
      })();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [subject, title, bodyHtml, template.key]);

  async function save() {
    setError("");
    setSaveOk(false);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${encodeURIComponent(template.key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, title, bodyHtml, translations: compact() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Opslaan mislukt");
      } else {
        setSaveOk(true);
      }
    } catch {
      setError("Geen verbinding");
    }
    setSaving(false);
  }

  async function resetToDefault() {
    if (!window.confirm("Terugzetten naar de standaardtekst van dit mailtype?")) return;
    setError("");
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${encodeURIComponent(template.key)}`, {
        method: "POST",
      });
      const data = (await res.json()) as { template?: EmailTemplateDraft; error?: string };
      if (!res.ok || !data.template) {
        setError(data.error ?? "Reset mislukt");
      } else {
        setMap(hydrateEmailTranslations(data.template));
        setSaveOk(true);
      }
    } catch {
      setError("Geen verbinding");
    }
    setResetting(false);
  }

  function insertToken(token: string, block?: boolean) {
    const markup = tokenMarkup(token);
    setLoc("bodyHtml", `${bodyHtml.trim()}${block ? `\n<p>${markup}</p>` : ` ${markup}`}`);
  }

  return (
    <div className="admin-product-editor-root admin-stack">
      <div className="admin-page-head">
        <div>
          <Link href="/admin/email" className="admin-breadcrumb">
            ← Alle templates
          </Link>
          <h1 className="admin-h1">{template.name}</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">{template.description}</p>
        </div>
        <div className="admin-form-actions">
          <button type="button" className="admin-link-action" disabled={resetting || saving} onClick={() => void resetToDefault()}>
            {resetting ? "…" : "Standaardtekst"}
          </button>
          <button type="button" className="admin-btn-primary" disabled={saving || resetting} onClick={() => void save()}>
            {saving ? "Opslaan…" : "Opslaan"}
          </button>
        </div>
      </div>

      <AdminLocaleTabs
        languages={languages}
        value={editLocale}
        onChange={setEditLocale}
        filledLocales={filled}
        hint="Onderwerp en HTML per taal. Lege vertalingen vallen terug op Nederlands bij verzenden."
      />

      {saveOk ? (
        <div className="admin-banner ok admin-m-0" role="status">
          Template opgeslagen. Nieuwe mails gebruiken deze tekst.
        </div>
      ) : null}
      {error ? <div className="admin-error-box">{error}</div> : null}

      <div className="admin-product-editor-grid">
        <div className="admin-product-editor-main">
          <div className="admin-panel-surface admin-stack-tight">
            <h2 className="admin-section-title">Kop</h2>
            <div>
              <label className="admin-label" htmlFor="email-subject">
                Onderwerp
              </label>
              <input
                id="email-subject"
                className="admin-field admin-field--flush"
                value={subject}
                onChange={(e) => setLoc("subject", e.target.value)}
              />
            </div>
            <div>
              <label className="admin-label" htmlFor="email-title">
                Titel in de mail
              </label>
              <input
                id="email-title"
                className="admin-field admin-field--flush"
                value={title}
                onChange={(e) => setLoc("title", e.target.value)}
              />
            </div>
          </div>

          <div className="admin-panel-surface admin-stack-tight">
            <h2 className="admin-section-title">Inhoud</h2>
            <p className="admin-muted admin-m-0">
              Schrijf de mail zoals klanten die lezen. Plaatsvelden zoals{" "}
              <code>{tokenMarkup("customer_name")}</code> worden bij verzenden ingevuld.
            </p>
            <AdminHtmlEditor
              minHeight="tall"
              placeholder="Schrijf de mail…"
              value={bodyHtml}
              onChange={(html) => setLoc("bodyHtml", html)}
              imageFolder="uploads"
              onImageError={setError}
            />
          </div>
        </div>

        <aside className="admin-product-editor-side" aria-label="Velden en voorbeeld">
          <div className="admin-panel-surface admin-stack-tight">
            <h2 className="admin-section-title">Velden invoegen</h2>
            <p className="admin-muted admin-m-0">Klik om een veld onderaan de tekst te zetten.</p>
            <div className="admin-email-token-list">
              {EMAIL_PLACEHOLDERS.map((item) => (
                <button
                  key={item.token}
                  type="button"
                  className="admin-email-token"
                  title={item.hint || item.label}
                  onClick={() => insertToken(item.token, item.block)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="admin-panel-surface admin-stack-tight">
            <h2 className="admin-section-title">Voorbeeld</h2>
            <p className="admin-muted admin-m-0">{previewSubject || "Onderwerp volgt uit de template."}</p>
            <div className="admin-email-preview-frame-wrap">
              <iframe
                title="E-mailvoorbeeld"
                className="admin-email-preview-frame"
                sandbox="allow-same-origin"
                srcDoc={previewHtml}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";

import { SITE_SETTING_GROUPS, type AdminSettingFieldView } from "@/lib/site-settings-defs";

type AdminSettingsFormProps = {
  initialFields: AdminSettingFieldView[];
};

export default function AdminSettingsForm({ initialFields }: AdminSettingsFormProps) {
  const [fields, setFields] = useState(initialFields);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const f of initialFields) {
      next[f.key] = f.secret ? "" : f.displayValue;
    }
    return next;
  });
  const [openManual, setOpenManual] = useState<string | null>(null);
  const [savingGroup, setSavingGroup] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const byGroup = useMemo(() => {
    const map = new Map<string, AdminSettingFieldView[]>();
    for (const f of fields) {
      const list = map.get(f.group) ?? [];
      list.push(f);
      map.set(f.group, list);
    }
    return map;
  }, [fields]);

  async function saveGroup(groupId: string) {
    setError("");
    setMessage("");
    setSavingGroup(groupId);
    const groupFields = byGroup.get(groupId) ?? [];
    const values: Record<string, string> = {};
    for (const f of groupFields) {
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
        setSavingGroup(null);
        return;
      }
      if (data.fields) {
        setFields(data.fields);
        setDrafts((prev) => {
          const next = { ...prev };
          for (const f of data.fields!) {
            next[f.key] = f.secret ? "" : f.displayValue;
          }
          return next;
        });
      }
      const n = data.saved?.length ?? 0;
      setMessage(
        n > 0
          ? `${n} key(s) opgeslagen in deze groep.`
          : "Geen wijzigingen (geheimen ongewijzigd laten = leeg laten).",
      );
    } catch {
      setError("Netwerkfout");
    }
    setSavingGroup(null);
  }

  return (
    <div className="admin-stack">
      {message ? (
        <div className="admin-banner ok admin-m-0" role="status">
          {message}
        </div>
      ) : null}
      {error ? <div className="admin-error-box">{error}</div> : null}

      {SITE_SETTING_GROUPS.map((group) => {
        const groupFields = byGroup.get(group.id) ?? [];
        if (!groupFields.length) return null;
        const groupOk = groupFields.every((f) => f.optional || f.configured);
        const requiredMissing = groupFields.filter((f) => !f.optional && !f.configured);

        return (
          <section key={group.id} className="admin-panel admin-stack-tight">
            <div className="admin-tools-row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h2 className="admin-panel-title admin-m-0">{group.title}</h2>
                <p className="admin-muted admin-m-0 admin-mt-05">{group.intro}</p>
              </div>
              <span
                className={`admin-badge-src${groupOk ? " admin-badge-easysales--ok" : " admin-badge-easysales--err"}`}
              >
                {groupOk ? "OK" : `${requiredMissing.length || groupFields.filter((f) => !f.configured).length} open`}
              </span>
            </div>

            <div className="admin-stack-tight admin-mt-1">
              {groupFields.map((field) => {
                const manualOpen = openManual === field.key;
                return (
                  <div key={field.key} className="admin-settings-key-card">
                    <div className="admin-tools-row" style={{ justifyContent: "space-between", gap: "0.75rem" }}>
                      <div>
                        <strong>{field.label}</strong>
                        <p className="admin-muted admin-m-0" style={{ fontSize: "0.78rem" }}>
                          <code>{field.key}</code>
                          {field.optional ? " · optioneel" : " · vereist"}
                          {" · "}
                          {field.configured
                            ? field.source === "database"
                              ? "opgeslagen in CRM"
                              : "via server/env"
                            : "niet gezet"}
                        </p>
                      </div>
                      <span className={`admin-settings-dot${field.configured ? " is-ok" : ""}`} aria-hidden />
                    </div>

                    <label className="admin-label admin-mt-1" htmlFor={`setting-${field.key}`}>
                      {field.secret
                        ? field.configured
                          ? `Nieuwe waarde (huidig: ${field.displayValue})`
                          : "Waarde"
                        : "Waarde"}
                    </label>
                    <input
                      id={`setting-${field.key}`}
                      className="admin-field"
                      type={field.secret ? "password" : "text"}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder={
                        field.secret
                          ? field.configured
                            ? "Laat leeg om huidige key te behouden"
                            : field.placeholder
                          : field.placeholder
                      }
                      value={drafts[field.key] ?? ""}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                    />

                    <button
                      type="button"
                      className="admin-link-action admin-mt-05"
                      style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}
                      onClick={() => setOpenManual((cur) => (cur === field.key ? null : field.key))}
                      aria-expanded={manualOpen}
                    >
                      {manualOpen ? "Handleiding verbergen" : "Handleiding: hoe en waar?"}
                    </button>

                    {manualOpen ? (
                      <div className="admin-settings-manual admin-mt-05">
                        <p className="admin-m-0">{field.manual.summary}</p>
                        <p className="admin-muted admin-mt-05 admin-m-0" style={{ fontSize: "0.8rem" }}>
                          Gebruikt voor: {field.manual.whereUsed}
                        </p>
                        <ol className="admin-mt-05" style={{ marginBottom: 0, paddingLeft: "1.2rem" }}>
                          {field.manual.steps.map((step) => (
                            <li key={step} style={{ marginTop: "0.35rem" }}>
                              {step}
                            </li>
                          ))}
                        </ol>
                        {field.manual.links?.length ? (
                          <ul className="admin-m-0 admin-mt-05" style={{ paddingLeft: "1.2rem" }}>
                            {field.manual.links.map((link) => (
                              <li key={link.href}>
                                <a
                                  href={link.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="admin-link-action"
                                >
                                  {link.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="admin-btn-primary admin-w-fit admin-mt-1"
              disabled={savingGroup === group.id}
              onClick={() => void saveGroup(group.id)}
            >
              {savingGroup === group.id ? "Opslaan…" : `Opslaan — ${group.title}`}
            </button>
          </section>
        );
      })}
    </div>
  );
}

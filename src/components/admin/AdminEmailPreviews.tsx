"use client";

import { useMemo, useState } from "react";

export type EmailPreviewTab = {
  id: string;
  label: string;
  html: string;
};

type AdminEmailPreviewsProps = {
  tabs: EmailPreviewTab[];
};

export default function AdminEmailPreviews({ tabs }: AdminEmailPreviewsProps) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const current = useMemo(() => tabs.find((t) => t.id === active) ?? tabs[0], [tabs, active]);
  const html = current?.html ?? "";

  return (
    <div className="admin-email-preview">
      <div className="admin-email-preview-tabs" role="tablist" aria-label="Email templates">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === active}
            className={`admin-email-preview-tab${t.id === active ? " is-active" : ""}`}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="admin-email-preview-hint">
        Same HTML as production sends. Inbox apps may tweak colors in dark mode; most users see a light canvas.
      </p>
      <div className="admin-email-preview-frame-wrap">
        <iframe
          title={current?.label ?? "Email preview"}
          className="admin-email-preview-frame"
          sandbox="allow-same-origin"
          srcDoc={html}
        />
      </div>
    </div>
  );
}

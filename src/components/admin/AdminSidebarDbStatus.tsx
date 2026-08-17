"use client";

import { useEffect, useState } from "react";

type StatusPayload = {
  ok: boolean;
  label: string;
  detail?: string;
  latencyMs?: number;
};

export default function AdminSidebarDbStatus() {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [payload, setPayload] = useState<StatusPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/admin/db-status", { cache: "no-store" });
        const data = (await res.json()) as StatusPayload & { error?: string };
        if (cancelled) {
          return;
        }
        if (!res.ok && res.status === 401) {
          setPayload({ ok: false, label: "Niet ingelogd", detail: data.error });
          setState("ready");
          return;
        }
        setPayload({
          ok: Boolean(data.ok),
          label: data.label ?? (data.ok ? "Verbonden" : "Fout"),
          detail: data.detail,
          latencyMs: data.latencyMs,
        });
        setState("ready");
      } catch {
        if (!cancelled) {
          setPayload({ ok: false, label: "Geen verbinding", detail: "Netwerkfout" });
          setState("error");
        }
      }
    }

    void load();
    const id = setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const ok = payload?.ok === true;
  const dotClass =
    state === "loading"
      ? "admin-sidebar-db-dot admin-sidebar-db-dot--pending"
      : ok
        ? "admin-sidebar-db-dot admin-sidebar-db-dot--ok"
        : "admin-sidebar-db-dot admin-sidebar-db-dot--err";

  return (
    <div className="admin-sidebar-db-status" role="status" aria-live="polite">
      <div className="admin-sidebar-db-status-row">
        <span className={dotClass} aria-hidden />
        <span className="admin-sidebar-db-status-title">Database</span>
      </div>
      <div className="admin-sidebar-db-status-line">
        {state === "loading" ? "Controleren…" : (payload?.label ?? "—")}
      </div>
      {payload?.latencyMs != null && state !== "loading" ? (
        <div className="admin-sidebar-db-status-meta">{payload.latencyMs} ms</div>
      ) : null}
      {payload?.detail && !payload.ok && state !== "loading" ? (
        <div className="admin-sidebar-db-status-detail" title={payload.detail}>
          {payload.detail}
        </div>
      ) : null}
    </div>
  );
}

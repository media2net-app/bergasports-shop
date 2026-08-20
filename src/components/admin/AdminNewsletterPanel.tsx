"use client";

import { useMemo, useState } from "react";

import AdminHtmlEditor from "@/components/admin/AdminHtmlEditor";
import DateTimePicker from "@/components/ui/DateTimePicker";
import {
  isoToLocalDateTimeValue,
  localDateTimeValueToIso,
} from "@/lib/datetime-picker";
import {
  campaignStatusLabel,
  NEWSLETTER_CRON_PATH,
  NEWSLETTER_CRON_SCHEDULE_LABEL,
  type NewsletterCampaignStatus,
  type NewsletterSubscriberStatus,
} from "@/lib/newsletter-shared";

export type NewsletterSubscriberClient = {
  id: string;
  email: string;
  name: string | null;
  source: string;
  locale: string | null;
  couponCode: string | null;
  status: NewsletterSubscriberStatus;
  consentAt: string;
  unsubscribedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NewsletterCampaignClient = {
  id: string;
  subject: string;
  title: string | null;
  bodyHtml: string;
  status: NewsletterCampaignStatus;
  recipientCount: number;
  sentCount: number;
  failCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Tab = "subscribers" | "campaigns";

type Props = {
  initialSubscribers: NewsletterSubscriberClient[];
  initialCampaigns: NewsletterCampaignClient[];
  promoCode: string;
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("nl-NL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function AdminNewsletterPanel({
  initialSubscribers,
  initialCampaigns,
  promoCode,
}: Props) {
  const [tab, setTab] = useState<Tab>("subscribers");
  const [subscribers, setSubscribers] = useState(initialSubscribers);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | NewsletterSubscriberStatus>("all");
  const [busyId, setBusyId] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [bodyHtml, setBodyHtml] = useState("<p></p>");
  const [scheduledLocal, setScheduledLocal] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState("");

  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addLocale, setAddLocale] = useState("nl");
  const [addSource, setAddSource] = useState("admin");
  const [addWelcome, setAddWelcome] = useState(false);
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return subscribers.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        s.email.includes(needle) ||
        (s.name ?? "").toLowerCase().includes(needle) ||
        s.source.toLowerCase().includes(needle) ||
        (s.locale ?? "").toLowerCase().includes(needle)
      );
    });
  }, [subscribers, q, statusFilter]);

  async function addSubscriber() {
    setError("");
    setNotice("");
    setAdding(true);
    try {
      const res = await fetch("/api/admin/newsletter/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: addEmail,
          name: addName.trim() || undefined,
          locale: addLocale.trim() || undefined,
          source: addSource.trim() || "admin",
          sendWelcome: addWelcome,
        }),
      });
      const data = (await res.json()) as {
        subscriber?: NewsletterSubscriberClient;
        created?: boolean;
        reactivated?: boolean;
        welcomeSent?: boolean;
        error?: string;
      };
      if (!res.ok || !data.subscriber) {
        setError(data.error ?? "Toevoegen mislukt");
      } else {
        setSubscribers((prev) => {
          const without = prev.filter((s) => s.id !== data.subscriber!.id);
          return [data.subscriber!, ...without];
        });
        const bits = [
          data.created ? "nieuw" : data.reactivated ? "heractiveerd" : "bijgewerkt",
          data.welcomeSent ? "welkomstmail verstuurd" : null,
        ].filter(Boolean);
        setNotice(`Abonnee ${bits.join(" · ")}`);
        setAddEmail("");
        setAddName("");
        setAddWelcome(false);
      }
    } catch {
      setError("Geen verbinding");
    }
    setAdding(false);
  }

  async function setSubscriberStatus(id: string, status: NewsletterSubscriberStatus) {
    setError("");
    setNotice("");
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/newsletter/subscribers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = (await res.json()) as {
        subscriber?: NewsletterSubscriberClient;
        error?: string;
      };
      if (!res.ok || !data.subscriber) {
        setError(data.error ?? "Status bijwerken mislukt");
      } else {
        setSubscribers((prev) => prev.map((s) => (s.id === id ? data.subscriber! : s)));
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusyId("");
  }

  async function removeSubscriber(id: string) {
    if (!window.confirm("Abonnee definitief verwijderen?")) return;
    setError("");
    setNotice("");
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/newsletter/subscribers?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Verwijderen mislukt");
      } else {
        setSubscribers((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusyId("");
  }

  function startEdit(campaign: NewsletterCampaignClient) {
    setEditingId(campaign.id);
    setSubject(campaign.subject);
    setTitle(campaign.title ?? "");
    setBodyHtml(campaign.bodyHtml || "<p></p>");
    setScheduledLocal(isoToLocalDateTimeValue(campaign.scheduledAt));
    setError("");
    setNotice("");
    setTab("campaigns");
  }

  function resetComposer() {
    setEditingId(null);
    setSubject("");
    setTitle("");
    setBodyHtml("<p></p>");
    setScheduledLocal("");
  }

  async function saveCampaign(opts?: { schedule?: boolean; clearSchedule?: boolean }) {
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const editing = editingId ? campaigns.find((c) => c.id === editingId) : null;
      let scheduledIso: string | null | undefined = undefined;
      if (opts?.clearSchedule) {
        scheduledIso = null;
      } else if (opts?.schedule) {
        scheduledIso = localDateTimeValueToIso(scheduledLocal);
        if (!scheduledIso) {
          setError("Kies een geldige plan-datum en tijd.");
          setSaving(false);
          return;
        }
      } else if (editing?.status === "scheduled" && scheduledLocal.trim()) {
        scheduledIso = localDateTimeValueToIso(scheduledLocal);
        if (!scheduledIso) {
          setError("Kies een geldige plan-datum en tijd.");
          setSaving(false);
          return;
        }
      }

      const url = editingId
        ? `/api/admin/newsletter/campaigns/${encodeURIComponent(editingId)}`
        : "/api/admin/newsletter/campaigns";

      const payload: Record<string, unknown> = { subject, title, bodyHtml };
      if (opts?.clearSchedule) {
        payload.clearSchedule = true;
        payload.scheduledAt = null;
      } else if (scheduledIso !== undefined) {
        payload.scheduledAt = scheduledIso;
      } else if (!editingId) {
        payload.scheduledAt = null;
      }

      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        campaign?: NewsletterCampaignClient;
        error?: string;
      };
      if (!res.ok || !data.campaign) {
        setError(data.error ?? "Opslaan mislukt");
      } else if (editingId) {
        setCampaigns((prev) => prev.map((c) => (c.id === editingId ? data.campaign! : c)));
        setScheduledLocal(isoToLocalDateTimeValue(data.campaign.scheduledAt));
        setNotice(
          data.campaign.status === "scheduled"
            ? `Gepland voor ${formatWhen(data.campaign.scheduledAt)}`
            : opts?.clearSchedule
              ? "Planning geannuleerd — concept"
              : "Campagne opgeslagen",
        );
      } else {
        setCampaigns((prev) => [data.campaign!, ...prev]);
        setEditingId(data.campaign.id);
        setScheduledLocal(isoToLocalDateTimeValue(data.campaign.scheduledAt));
        setNotice(
          data.campaign.status === "scheduled"
            ? `Campagne gepland voor ${formatWhen(data.campaign.scheduledAt)}`
            : "Campagne aangemaakt",
        );
      }
    } catch {
      setError("Geen verbinding");
    }
    setSaving(false);
  }

  async function sendCampaign(id: string) {
    if (
      !window.confirm(
        "Nieuwsbrief versturen naar alle actieve abonnees? Dit kan even duren.",
      )
    ) {
      return;
    }
    setError("");
    setNotice("");
    setSendingId(id);
    try {
      const res = await fetch(`/api/admin/newsletter/campaigns/${encodeURIComponent(id)}/send`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        campaign?: NewsletterCampaignClient;
        error?: string;
        ok?: boolean;
      };
      if (data.campaign) {
        setCampaigns((prev) => prev.map((c) => (c.id === id ? data.campaign! : c)));
        if (editingId === id) {
          setScheduledLocal(isoToLocalDateTimeValue(data.campaign.scheduledAt));
        }
      }
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Versturen mislukt");
      } else {
        setNotice(
          data.error ||
            `Verstuurd naar ${data.campaign?.sentCount ?? 0} van ${data.campaign?.recipientCount ?? 0} abonnees.`,
        );
      }
    } catch {
      setError("Geen verbinding");
    }
    setSendingId("");
  }

  async function cancelSchedule(id: string) {
    setError("");
    setNotice("");
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/newsletter/campaigns/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel_schedule" }),
      });
      const data = (await res.json()) as {
        campaign?: NewsletterCampaignClient;
        error?: string;
      };
      if (!res.ok || !data.campaign) {
        setError(data.error ?? "Annuleren mislukt");
      } else {
        setCampaigns((prev) => prev.map((c) => (c.id === id ? data.campaign! : c)));
        if (editingId === id) {
          setScheduledLocal("");
        }
        setNotice("Planning geannuleerd");
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusyId("");
  }

  async function duplicateCampaign(id: string) {
    setError("");
    setNotice("");
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/newsletter/campaigns/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "duplicate" }),
      });
      const data = (await res.json()) as {
        campaign?: NewsletterCampaignClient;
        error?: string;
      };
      if (!res.ok || !data.campaign) {
        setError(data.error ?? "Dupliceren mislukt");
      } else {
        setCampaigns((prev) => [data.campaign!, ...prev]);
        startEdit(data.campaign);
        setNotice("Kopie aangemaakt als concept");
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusyId("");
  }

  async function deleteCampaign(id: string) {
    if (!window.confirm("Campagne verwijderen?")) return;
    setError("");
    setNotice("");
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/newsletter/campaigns/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Verwijderen mislukt");
      } else {
        setCampaigns((prev) => prev.filter((c) => c.id !== id));
        if (editingId === id) resetComposer();
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusyId("");
  }

  const liveActiveCount = subscribers.filter((s) => s.status === "active").length;

  const exportHref = `/api/admin/newsletter/subscribers/export?status=${encodeURIComponent(statusFilter)}${
    q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""
  }`;

  const editingCampaign = editingId ? campaigns.find((c) => c.id === editingId) : null;
  const canEditContent =
    !editingCampaign ||
    editingCampaign.status === "draft" ||
    editingCampaign.status === "scheduled" ||
    editingCampaign.status === "failed" ||
    editingCampaign.status === "sent";

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Nieuwsbrief</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            {liveActiveCount} actieve abonnees · welkomstcode{" "}
            <code className="admin-badge-src">{promoCode}</code> (instellingen → meldingen)
          </p>
        </div>
        <div className="admin-form-actions">
          <button
            type="button"
            className={tab === "subscribers" ? "admin-btn-primary" : "admin-btn-secondary"}
            onClick={() => setTab("subscribers")}
          >
            Abonnees
          </button>
          <button
            type="button"
            className={tab === "campaigns" ? "admin-btn-primary" : "admin-btn-secondary"}
            onClick={() => setTab("campaigns")}
          >
            Campagnes
          </button>
        </div>
      </div>

      {error ? <p className="admin-error-box">{error}</p> : null}
      {notice ? (
        <div className="admin-banner ok admin-m-0" role="status">
          {notice}
        </div>
      ) : null}

      {tab === "subscribers" ? (
        <>
          <form
            className="admin-panel admin-stack"
            onSubmit={(e) => {
              e.preventDefault();
              void addSubscriber();
            }}
          >
            <header className="admin-settings-form-head">
              <div>
                <h2 className="admin-settings-form-title">Abonnee toevoegen</h2>
                <p className="admin-settings-form-intro">
                  Handmatig toevoegen of heractiveren. Standaard geen welkomstmail met
                  promotiecode.
                </p>
              </div>
              <div className="admin-form-actions">
                <button type="submit" className="admin-btn-primary" disabled={adding}>
                  {adding ? "Bezig…" : "Toevoegen"}
                </button>
              </div>
            </header>

            <div className="admin-form-grid">
              <div className="admin-settings-field admin-span-2">
                <label className="admin-settings-field-label" htmlFor="nl-add-email">
                  E-mail
                </label>
                <input
                  id="nl-add-email"
                  type="email"
                  className="admin-field admin-field--flush"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  required
                  placeholder="naam@voorbeeld.nl"
                />
              </div>
              <div className="admin-settings-field">
                <label className="admin-settings-field-label" htmlFor="nl-add-name">
                  Naam (optioneel)
                </label>
                <input
                  id="nl-add-name"
                  className="admin-field admin-field--flush"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Voornaam"
                />
              </div>
              <div className="admin-settings-field">
                <label className="admin-settings-field-label" htmlFor="nl-add-locale">
                  Locale
                </label>
                <input
                  id="nl-add-locale"
                  className="admin-field admin-field--flush"
                  value={addLocale}
                  onChange={(e) => setAddLocale(e.target.value)}
                  placeholder="nl"
                />
              </div>
              <div className="admin-settings-field">
                <label className="admin-settings-field-label" htmlFor="nl-add-source">
                  Bron
                </label>
                <input
                  id="nl-add-source"
                  className="admin-field admin-field--flush"
                  value={addSource}
                  onChange={(e) => setAddSource(e.target.value)}
                  placeholder="admin"
                />
              </div>
              <div className="admin-settings-field admin-span-2">
                <label className="admin-check-highlight">
                  <input
                    type="checkbox"
                    checked={addWelcome}
                    onChange={(e) => setAddWelcome(e.target.checked)}
                  />
                  Stuur welkomstmail (met promotiecode)
                </label>
              </div>
            </div>
          </form>

          <div className="admin-panel admin-stack-tight">
            <div className="admin-form-grid" style={{ alignItems: "end" }}>
              <div className="admin-settings-field">
                <label className="admin-settings-field-label" htmlFor="nl-search">
                  Zoeken
                </label>
                <input
                  id="nl-search"
                  className="admin-field admin-field--flush"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="E-mail, naam, bron of locale…"
                />
              </div>
              <div className="admin-settings-field">
                <label className="admin-settings-field-label" htmlFor="nl-status">
                  Status
                </label>
                <select
                  id="nl-status"
                  className="admin-field admin-field--flush"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as "all" | NewsletterSubscriberStatus)
                  }
                >
                  <option value="all">Alles</option>
                  <option value="active">Actief</option>
                  <option value="unsubscribed">Uitgeschreven</option>
                </select>
              </div>
              <div className="admin-form-actions">
                <a className="admin-btn-secondary" href={exportHref}>
                  Export CSV
                </a>
              </div>
            </div>
          </div>

          <div className="admin-panel admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>E-mail</th>
                  <th>Bron</th>
                  <th>Locale</th>
                  <th>Status</th>
                  <th>Aangemeld</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="admin-muted">
                      Geen abonnees gevonden.
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <a href={`mailto:${s.email}`}>{s.email}</a>
                        {s.name ? (
                          <div className="admin-muted" style={{ fontSize: "0.8rem" }}>
                            {s.name}
                          </div>
                        ) : null}
                        {s.couponCode ? (
                          <div className="admin-muted" style={{ fontSize: "0.8rem" }}>
                            Code: {s.couponCode}
                          </div>
                        ) : null}
                      </td>
                      <td className="admin-muted admin-text-sm">{s.source}</td>
                      <td className="admin-muted admin-text-sm">{s.locale || "—"}</td>
                      <td>
                        <span className="admin-badge-src">
                          {s.status === "active" ? "Actief" : "Uitgeschreven"}
                        </span>
                      </td>
                      <td className="admin-muted admin-text-sm">{formatWhen(s.consentAt)}</td>
                      <td className="admin-td-right">
                        {s.status === "active" ? (
                          <button
                            type="button"
                            className="admin-link-action"
                            disabled={busyId === s.id}
                            onClick={() => void setSubscriberStatus(s.id, "unsubscribed")}
                          >
                            Uitschrijven
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="admin-link-action"
                            disabled={busyId === s.id}
                            onClick={() => void setSubscriberStatus(s.id, "active")}
                          >
                            Heractiveren
                          </button>
                        )}{" "}
                        <button
                          type="button"
                          className="admin-link-action"
                          disabled={busyId === s.id}
                          onClick={() => void removeSubscriber(s.id)}
                        >
                          Verwijder
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <form
            className="admin-panel admin-stack"
            onSubmit={(e) => {
              e.preventDefault();
              void saveCampaign();
            }}
          >
            <header className="admin-settings-form-head">
              <div>
                <h2 className="admin-settings-form-title">
                  {editingId ? "Campagne bewerken" : "Nieuwe campagne"}
                </h2>
                <p className="admin-settings-form-intro">
                  Onderwerp en HTML-inhoud. Gepland versturen via cron{" "}
                  <code className="admin-badge-src">{NEWSLETTER_CRON_PATH}</code> (
                  {NEWSLETTER_CRON_SCHEDULE_LABEL}) met{" "}
                  <code className="admin-badge-src">CRON_SECRET</code>.
                </p>
              </div>
              <div className="admin-form-actions">
                {editingId ? (
                  <button type="button" className="admin-link-action" onClick={resetComposer}>
                    Nieuw
                  </button>
                ) : null}
                <button type="submit" className="admin-btn-primary" disabled={saving || !canEditContent}>
                  {saving ? "Opslaan…" : "Opslaan"}
                </button>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  disabled={
                    saving ||
                    !canEditContent ||
                    !scheduledLocal.trim() ||
                    editingCampaign?.status === "sent" ||
                    editingCampaign?.status === "sending"
                  }
                  onClick={() => void saveCampaign({ schedule: true })}
                >
                  {editingCampaign?.status === "scheduled" ? "Herplannen" : "Plan verzending"}
                </button>
                {editingCampaign?.status === "scheduled" ? (
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    disabled={saving}
                    onClick={() => void saveCampaign({ clearSchedule: true })}
                  >
                    Annuleer planning
                  </button>
                ) : null}
                {editingId ? (
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    disabled={sendingId === editingId || saving}
                    onClick={() => void sendCampaign(editingId)}
                  >
                    {sendingId === editingId ? "Versturen…" : "Verstuur nu"}
                  </button>
                ) : null}
              </div>
            </header>

            <div className="admin-form-grid">
              <div className="admin-settings-field admin-span-2">
                <label className="admin-settings-field-label" htmlFor="nl-subject">
                  Onderwerp
                </label>
                <input
                  id="nl-subject"
                  className="admin-field admin-field--flush"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  placeholder="Nieuws van Bergasports"
                />
              </div>
              <div className="admin-settings-field admin-span-2">
                <label className="admin-settings-field-label" htmlFor="nl-title">
                  Titel in mail (optioneel)
                </label>
                <input
                  id="nl-title"
                  className="admin-field admin-field--flush"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Zelfde als onderwerp als leeg"
                />
              </div>
              <div className="admin-settings-field admin-span-2">
                <label className="admin-settings-field-label" htmlFor="nl-scheduled">
                  Gepland versturen (optioneel)
                </label>
                <DateTimePicker
                  id="nl-scheduled"
                  variant="admin"
                  mode="datetime"
                  minuteStep={15}
                  value={scheduledLocal}
                  onChange={setScheduledLocal}
                  placeholder="Kies datum en tijd"
                />
              </div>
            </div>

            <div className="admin-settings-field">
              <span className="admin-settings-field-label">Inhoud</span>
              <AdminHtmlEditor value={bodyHtml} onChange={setBodyHtml} minHeight="tall" />
            </div>
          </form>

          <div className="admin-panel admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Onderwerp</th>
                  <th>Status</th>
                  <th>Gepland</th>
                  <th>Verstuurd</th>
                  <th>Aangemaakt</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="admin-muted">
                      Nog geen campagnes.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((c) => (
                    <tr key={c.id} className={editingId === c.id ? "admin-table-row-active" : undefined}>
                      <td>
                        <div>{c.subject}</div>
                        {c.status === "sent" || c.status === "failed" ? (
                          <div className="admin-muted" style={{ fontSize: "0.8rem" }}>
                            {c.sentCount}/{c.recipientCount} ok
                            {c.failCount ? ` · ${c.failCount} mislukt` : ""}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <span className="admin-badge-src">{campaignStatusLabel(c.status)}</span>
                      </td>
                      <td className="admin-muted admin-text-sm">{formatWhen(c.scheduledAt)}</td>
                      <td className="admin-muted admin-text-sm">{formatWhen(c.sentAt)}</td>
                      <td className="admin-muted admin-text-sm">{formatWhen(c.createdAt)}</td>
                      <td className="admin-td-right">
                        <button
                          type="button"
                          className="admin-link-action"
                          onClick={() => startEdit(c)}
                        >
                          Bewerken
                        </button>{" "}
                        <button
                          type="button"
                          className="admin-link-action"
                          disabled={busyId === c.id}
                          onClick={() => void duplicateCampaign(c.id)}
                        >
                          Dupliceer
                        </button>{" "}
                        {c.status === "scheduled" ? (
                          <button
                            type="button"
                            className="admin-link-action"
                            disabled={busyId === c.id}
                            onClick={() => void cancelSchedule(c.id)}
                          >
                            Annuleer plan
                          </button>
                        ) : null}{" "}
                        {c.status !== "sending" ? (
                          <button
                            type="button"
                            className="admin-link-action"
                            disabled={sendingId === c.id}
                            onClick={() => void sendCampaign(c.id)}
                          >
                            {sendingId === c.id ? "…" : "Verstuur"}
                          </button>
                        ) : null}{" "}
                        <button
                          type="button"
                          className="admin-link-action"
                          disabled={busyId === c.id || c.status === "sending"}
                          onClick={() => void deleteCampaign(c.id)}
                        >
                          Verwijder
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

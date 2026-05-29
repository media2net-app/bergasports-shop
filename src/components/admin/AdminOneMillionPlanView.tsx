"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { formatDashboardMoney } from "@/lib/dashboard-currency";
import {
  ONE_MILLION_BENCHMARKS,
  ONE_MILLION_PHASE_LABELS,
  ONE_MILLION_PILLARS,
  ONE_MILLION_PLAN_ITEMS,
  ONE_MILLION_PLAN_LEGACY_STORAGE_KEY,
  ONE_MILLION_PLAN_STORAGE_KEY,
  ONE_MILLION_PRIORITY_LABELS,
  ONE_MILLION_SHOP_REVENUE_TARGET_RON,
  countPlanItemsByPhase,
  getAutoCompletedPlanItemIds,
  type OneMillionPhase,
  type OneMillionPillarId,
  type OneMillionPlanSignals,
} from "@/lib/one-million-plan";

type AdminOneMillionPlanViewProps = {
  signals: OneMillionPlanSignals | null;
  superAdmin: boolean;
  shopRevenueRon: number;
};

function parseChecked(raw: string | null): Set<string> {
  if (!raw) {
    return new Set();
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function phaseProgress(
  items: typeof ONE_MILLION_PLAN_ITEMS,
  isDone: (id: string) => boolean,
  phase: OneMillionPhase,
) {
  const subset = items.filter((i) => i.phase === phase);
  if (!subset.length) {
    return 0;
  }
  const done = subset.filter((i) => isDone(i.id)).length;
  return Math.round((done / subset.length) * 100);
}

function imageMigrationPct(signals: OneMillionPlanSignals | null): number | null {
  if (!signals?.productsTotal) {
    return null;
  }
  const hosted = signals.productsFullyHosted;
  return Math.min(100, Math.round((hosted / signals.productsTotal) * 100));
}

function ProgressRing({
  pct,
  valueLabel,
  subLabel,
  ariaLabel,
}: {
  pct: number;
  valueLabel: string;
  subLabel: string;
  ariaLabel: string;
}) {
  const dash = `${(pct / 100) * 327} 327`;
  return (
    <div className="admin-one-million-ring-wrap" aria-label={ariaLabel}>
      <svg className="admin-one-million-ring" viewBox="0 0 120 120" role="img">
        <circle className="admin-one-million-ring-bg" cx="60" cy="60" r="52" />
        <circle className="admin-one-million-ring-fg" cx="60" cy="60" r="52" strokeDasharray={dash} />
      </svg>
      <div className="admin-one-million-ring-label">
        <span className="admin-one-million-ring-value">{valueLabel}</span>
        <span className="admin-one-million-ring-sub">{subLabel}</span>
      </div>
    </div>
  );
}

export default function AdminOneMillionPlanView({
  signals,
  superAdmin,
  shopRevenueRon,
}: AdminOneMillionPlanViewProps) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);
  const [pillar, setPillar] = useState<OneMillionPillarId | "all">("all");
  const [phaseFilter, setPhaseFilter] = useState<OneMillionPhase | "all">("all");
  const [showDone, setShowDone] = useState(true);

  useEffect(() => {
    let raw = localStorage.getItem(ONE_MILLION_PLAN_STORAGE_KEY);
    if (!raw) {
      const legacy = localStorage.getItem(ONE_MILLION_PLAN_LEGACY_STORAGE_KEY);
      if (legacy) {
        localStorage.setItem(ONE_MILLION_PLAN_STORAGE_KEY, legacy);
        raw = legacy;
      }
    }
    setChecked(parseChecked(raw));
    setHydrated(true);
  }, []);

  const persist = useCallback((next: Set<string>) => {
    setChecked(next);
    localStorage.setItem(ONE_MILLION_PLAN_STORAGE_KEY, JSON.stringify([...next]));
  }, []);

  const toggle = useCallback(
    (id: string) => {
      const next = new Set(checked);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      persist(next);
    },
    [checked, persist],
  );

  const planItems = useMemo(
    () =>
      ONE_MILLION_PLAN_ITEMS.filter((i) => superAdmin || i.id !== "easy-sales-alignment"),
    [superAdmin],
  );

  const autoCompleted = useMemo(() => getAutoCompletedPlanItemIds(signals), [signals]);

  const isItemDone = useCallback(
    (id: string) => checked.has(id) || autoCompleted.has(id),
    [checked, autoCompleted],
  );

  const visibleItems = useMemo(() => {
    return planItems.filter((item) => {
      if (pillar !== "all" && item.pillar !== pillar) {
        return false;
      }
      if (phaseFilter !== "all" && item.phase !== phaseFilter) {
        return false;
      }
      if (!showDone && isItemDone(item.id)) {
        return false;
      }
      return true;
    });
  }, [pillar, phaseFilter, showDone, planItems, isItemDone]);

  const total = planItems.length;
  const doneCount = planItems.filter((i) => isItemDone(i.id)).length;
  const overallPct = total ? Math.round((doneCount / total) * 100) : 0;
  const revenuePct = Math.min(
    100,
    Math.round((shopRevenueRon / ONE_MILLION_SHOP_REVENUE_TARGET_RON) * 100),
  );
  const revenueLabel = formatDashboardMoney(shopRevenueRon, "RON", 1);
  const targetLabel = formatDashboardMoney(ONE_MILLION_SHOP_REVENUE_TARGET_RON, "RON", 1);
  const phaseCounts = countPlanItemsByPhase(ONE_MILLION_PLAN_ITEMS);
  const migrationPct = imageMigrationPct(signals);

  const signalAlerts = useMemo(() => {
    if (!signals) {
      return [];
    }
    const alerts: { tone: "warn" | "ok"; text: string }[] = [];
    if (signals.productsWithExternalImages > 0) {
      alerts.push({
        tone: "warn",
        text: `Image migration: ${signals.productsWithExternalImages} product(s) still use external image URL(s). Run npm run migrate:product-images:complete — ${signals.productsFullyHosted}/${signals.productsTotal} fully on Storage (${signals.mirroredImageAssets} files in bucket).`,
      });
    } else if (signals.productsTotal > 0) {
      alerts.push({
        tone: "ok",
        text: `Image migration: complete — ${signals.productsFullyHosted}/${signals.productsTotal} products use only hosted storage (${signals.mirroredImageAssets} mirrored files).`,
      });
    }
    if (signals.productsWithExternalDescriptionImages > 0) {
      alerts.push({
        tone: "warn",
        text: `Description images: ${signals.productsWithExternalDescriptionImages} product(s) still hotlink external <img> URLs in HTML. Run npm run sanitize:description-images.`,
      });
    } else if (signals.productsTotal > 0) {
      alerts.push({
        tone: "ok",
        text: "Description images: all product HTML descriptions use only hosted images (or have no images).",
      });
    }
    if (signals.categoriesExternalLink > 0) {
      alerts.push({
        tone: "warn",
        text: `${signals.categoriesExternalLink} categor${signals.categoriesExternalLink === 1 ? "y" : "ies"} still use external shop links — point them to /shop.`,
      });
    } else if (signals.categoriesTotal > 0) {
      alerts.push({
        tone: "ok",
        text: `Category links: all ${signals.categoriesTotal} categories point to your shop (/slug paths).`,
      });
    }
    if (signals.legalPagesReady) {
      alerts.push({
        tone: "ok",
        text: "Legal pages: terms, privacy, shipping/returns, and cookies are published in Romanian.",
      });
    } else {
      alerts.push({
        tone: "warn",
        text: "Legal pages: run npm run seed:site-pages to publish full RO terms, GDPR, cookies, and delivery/returns.",
      });
    }
    if (signals.cwvMobileReady) {
      const urlNote = signals.cwvMobileTestUrl
        ? ` (${signals.cwvMobileTestUrl.replace(/^https?:\/\//, "")})`
        : "";
      const homeNote = signals.cwvMobileHomeLcpDisplay
        ? ` Homepage LCP ${signals.cwvMobileHomeLcpDisplay} — optional hero tuning.`
        : "";
      alerts.push({
        tone: "ok",
        text: `Core Web Vitals (mobile)${urlNote}: LCP ${signals.cwvMobileLcpDisplay ?? "—"}, performance ${signals.cwvMobilePerformance ?? "—"}, CLS ${signals.cwvMobileCls ?? 0} — targets met.${homeNote}`,
      });
    } else {
      const lcp =
        signals.cwvMobileLcpDisplay ??
        (signals.cwvMobileLcpMs != null ? `${(signals.cwvMobileLcpMs / 1000).toFixed(1)} s` : "not tested");
      const perf = signals.cwvMobilePerformance ?? "—";
      const cls = signals.cwvMobileCls ?? 0;
      alerts.push({
        tone: "warn",
        text: `Core Web Vitals (mobile): LCP ${lcp} (target ≤2.5s), performance ${perf} (≥80), CLS ${cls} (≤0.1). Run Admin → Performance after deploy, or npm run pagespeed:mobile.`,
      });
    }
    if (signals.analyticsSessionsLast7d >= 10) {
      alerts.push({
        tone: "ok",
        text: `Analytics baseline: ${signals.analyticsSessionsLast7d} session(s) in the last 7 days — enough for funnel review.`,
      });
    } else {
      alerts.push({
        tone: "warn",
        text: `Analytics baseline: only ${signals.analyticsSessionsLast7d} session(s) in 7 days — browse the shop to collect data, then review Admin → Analytics.`,
      });
    }
    if (signals.easySalesConfigured) {
      if (signals.productsWithEasySalesMapping >= 50) {
        alerts.push({
          tone: "ok",
          text: `Easy Sales mapping: ${signals.productsWithEasySalesMapping} shop product(s) linked — stock sync can update quantities.`,
        });
      } else {
        alerts.push({
          tone: "warn",
          text: `Easy Sales mapping: only ${signals.productsWithEasySalesMapping} product(s) linked (target ≥50). Admin → Products → Export mapping CSV, set product_website_id in Easy Sales, then sync stock.`,
        });
      }
    } else {
      alerts.push({
        tone: "warn",
        text: "Easy Sales: set EASY_SALES_API_TOKEN and EASY_SALES_WEBSITE_TOKEN for order push and stock sync.",
      });
    }
    return alerts;
  }, [signals, migrationPct]);

  return (
    <div className="admin-stack admin-one-million">
      <section className="admin-one-million-hero admin-panel">
        <div className="admin-one-million-hero-grid">
          <div>
            <p className="admin-one-million-eyebrow">Shop sales target · Romania · 2026</p>
            <h2 className="admin-one-million-hero-title">1 million RON in shop revenue</h2>
            <p className="admin-muted admin-m-0 admin-mt-05">
              Primary goal: {targetLabel} cumulative revenue from bergasports.com checkout (excl.
              cancelled). Execution checklist progress is saved in this browser.
            </p>
            <div className="admin-one-million-revenue-bar admin-mt-1">
              <div className="admin-one-million-revenue-bar-meta">
                <span>
                  <strong>{revenueLabel}</strong> shop revenue
                </span>
                <span className="admin-muted">
                  {revenuePct}% of {targetLabel}
                </span>
              </div>
              <div className="admin-one-million-phase-bar">
                <span
                  className="admin-one-million-phase-bar-fill admin-one-million-phase-bar-fill--revenue"
                  style={{ width: `${revenuePct}%` }}
                />
              </div>
            </div>
          </div>
          <div className="admin-one-million-rings">
            <ProgressRing
              pct={revenuePct}
              valueLabel={`${revenuePct}%`}
              subLabel="to 1M RON"
              ariaLabel={`Shop revenue ${revenuePct} percent of one million RON target`}
            />
            <ProgressRing
              pct={hydrated ? overallPct : 0}
              valueLabel={hydrated ? `${overallPct}%` : "—"}
              subLabel={`${doneCount}/${total} tasks`}
              ariaLabel={`Roadmap checklist ${overallPct} percent complete`}
            />
          </div>
        </div>

        <div className="admin-one-million-phase-row">
          {(["foundation", "growth", "excellence"] as const).map((phase) => (
            <div key={phase} className="admin-one-million-phase-card">
              <span className="admin-one-million-phase-name">{ONE_MILLION_PHASE_LABELS[phase]}</span>
              <span className="admin-one-million-phase-meta">
                {phaseCounts[phase]} items · {hydrated ? phaseProgress(planItems, isItemDone, phase) : 0}%
              </span>
              <div className="admin-one-million-phase-bar">
                <span
                  className="admin-one-million-phase-bar-fill"
                  style={{ width: `${hydrated ? phaseProgress(planItems, isItemDone, phase) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {signalAlerts.length > 0 ? (
        <div className="admin-stack-tight">
          {signalAlerts.map((alert) => (
            <div key={alert.text} className={`admin-banner ${alert.tone === "ok" ? "ok" : "warn"}`}>
              {alert.text}
            </div>
          ))}
        </div>
      ) : null}

      <section className="admin-panel admin-stack-tight">
        <h2 className="admin-panel-title admin-m-0">Romania benchmarks (top-tier vs typical)</h2>
        <p className="admin-muted admin-m-0">
          Use these as north stars — measure yours in Analytics, Performance, and Reports.
        </p>
        <div className="admin-one-million-benchmark-grid">
          {ONE_MILLION_BENCHMARKS.map((row) => (
            <div key={row.label} className="admin-one-million-benchmark">
              <span className="admin-one-million-benchmark-label">{row.label}</span>
              <span className="admin-one-million-benchmark-top">{row.top1}</span>
              <span className="admin-one-million-benchmark-typical">Typical: {row.typical}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-one-million-pillars" aria-label="Focus pillars">
        {ONE_MILLION_PILLARS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`admin-one-million-pillar${pillar === p.id ? " is-active" : ""}`}
            onClick={() => setPillar((cur) => (cur === p.id ? "all" : p.id))}
          >
            <span className="admin-one-million-pillar-title">{p.title}</span>
            <span className="admin-one-million-pillar-sub">{p.subtitle}</span>
          </button>
        ))}
      </section>

      <div className="admin-one-million-toolbar">
        <div className="admin-period-filter" role="group" aria-label="Phase filter">
          <button
            type="button"
            className={`admin-period-filter-btn${phaseFilter === "all" ? " is-active" : ""}`}
            onClick={() => setPhaseFilter("all")}
          >
            All phases
          </button>
          {(["foundation", "growth", "excellence"] as const).map((phase) => (
            <button
              key={phase}
              type="button"
              className={`admin-period-filter-btn${phaseFilter === phase ? " is-active" : ""}`}
              onClick={() => setPhaseFilter(phase)}
            >
              {phase === "foundation" ? "Foundation" : phase === "growth" ? "Growth" : "Excellence"}
            </button>
          ))}
        </div>
        <label className="admin-one-million-toggle">
          <input
            type="checkbox"
            checked={showDone}
            onChange={(e) => setShowDone(e.target.checked)}
          />
          Show completed
        </label>
      </div>

      <ul className="admin-one-million-list">
        {visibleItems.map((item) => {
          const verified = autoCompleted.has(item.id);
          const isDone = isItemDone(item.id);
          const pillarMeta = ONE_MILLION_PILLARS.find((p) => p.id === item.pillar);
          return (
            <li
              key={item.id}
              className={`admin-one-million-item admin-panel${isDone ? " is-done" : ""}${verified ? " is-verified" : ""}`}
            >
              <label className="admin-one-million-check">
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => toggle(item.id)}
                  disabled={!hydrated || verified}
                  title={verified ? "Verified automatically from live data" : undefined}
                />
                <span className="admin-one-million-check-ui" aria-hidden />
              </label>
              <div className="admin-one-million-item-body">
                <div className="admin-one-million-item-head">
                  <h3 className="admin-one-million-item-title">{item.title}</h3>
                  <span className={`admin-one-million-priority admin-one-million-priority--${item.priority}`}>
                    {ONE_MILLION_PRIORITY_LABELS[item.priority]}
                  </span>
                  {verified ? (
                    <span className="admin-one-million-verified-badge">Verified</span>
                  ) : null}
                  <span className="admin-one-million-phase-tag">
                    {ONE_MILLION_PHASE_LABELS[item.phase].replace(/^Phase \d — /, "")}
                  </span>
                </div>
                <p className="admin-muted admin-m-0">{item.description}</p>
                {item.signalHint && signals ? (
                  <p className="admin-one-million-hint admin-m-0">{item.signalHint}</p>
                ) : null}
                {pillarMeta ? (
                  <p className="admin-one-million-target admin-m-0">
                    <strong>Pillar goal:</strong> {pillarMeta.target}
                  </p>
                ) : null}
                <div className="admin-one-million-links">
                  {item.adminHref ? (
                    <Link href={item.adminHref} className="admin-one-million-link">
                      Open in admin →
                    </Link>
                  ) : null}
                  {item.shopHref ? (
                    <Link href={item.shopHref} className="admin-one-million-link" target="_blank">
                      View in shop →
                    </Link>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {visibleItems.length === 0 ? (
        <p className="admin-muted admin-m-0">No items match this filter. Show completed or pick another pillar.</p>
      ) : null}
    </div>
  );
}

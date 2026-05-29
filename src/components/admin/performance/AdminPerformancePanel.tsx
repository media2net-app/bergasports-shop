"use client";

import { useCallback, useEffect, useState } from "react";

import type { PageSpeedReport, PageSpeedStrategy } from "@/lib/pagespeed-types";

import { psiScoreTone } from "@/components/admin/performance/PsiCategoryGauge";
import PsiReportPanel from "@/components/admin/performance/PsiReportPanel";

type PageSpeedHistoryRow = {
  id: string;
  strategy: PageSpeedStrategy;
  url: string;
  fetchedAt: string;
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
};

type Config = {
  shopUrl: string;
  apiKeyConfigured: boolean;
  latest: { mobile: PageSpeedReport | null; desktop: PageSpeedReport | null };
  previous: { mobile: PageSpeedReport | null; desktop: PageSpeedReport | null };
  history: PageSpeedHistoryRow[];
};

type StrategyState = {
  report: PageSpeedReport | null;
  previousReport: PageSpeedReport | null;
  loading: boolean;
  error: string;
  persistWarning: boolean;
};

const EMPTY: StrategyState = {
  report: null,
  previousReport: null,
  loading: false,
  error: "",
  persistWarning: false,
};

const DELTA_SUFFIX = " vs previous test";

function formatTestTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function performanceDelta(
  current: number | null,
  previous: number | null,
): { label: string; tone: "up" | "down" | "same" } | null {
  if (current == null || previous == null) {
    return null;
  }
  const d = current - previous;
  if (d === 0) {
    return { label: `0${DELTA_SUFFIX}`, tone: "same" };
  }
  if (d > 0) {
    return { label: `+${d}${DELTA_SUFFIX}`, tone: "up" };
  }
  return { label: `${d}${DELTA_SUFFIX}`, tone: "down" };
}

function formatDeltaShort(label: string): string {
  return label.replace(DELTA_SUFFIX, "").trim();
}

function StrategyCard({
  strategy,
  label,
  state,
  onRun,
  disabled,
}: {
  strategy: PageSpeedStrategy;
  label: string;
  state: StrategyState;
  onRun: (strategy: PageSpeedStrategy) => void;
  disabled: boolean;
}) {
  const { report, previousReport, loading, error, persistWarning } = state;
  const perf = report?.categories.performance ?? null;
  const delta = performanceDelta(perf, previousReport?.categories.performance ?? null);

  return (
    <article className="admin-panel admin-perf-strategy-card" aria-labelledby={`perf-${strategy}-title`}>
      <div className="admin-perf-strategy-head">
        <div>
          <h2 id={`perf-${strategy}-title`} className="admin-panel-title admin-m-0">
            {label}
          </h2>
          {report ? (
            <p className="admin-muted admin-m-0 admin-mt-05">
              Last saved test · {formatTestTime(report.fetchedAt)}
            </p>
          ) : (
            <p className="admin-muted admin-m-0 admin-mt-05">No test run yet</p>
          )}
        </div>
        <button
          type="button"
          className="admin-btn-primary"
          disabled={disabled || loading}
          onClick={() => onRun(strategy)}
        >
          {loading ? "Running…" : "Run test"}
        </button>
      </div>

      {error ? <div className="admin-error-box admin-mt-1">{error}</div> : null}
      {persistWarning ? (
        <p className="admin-perf-saved-note admin-mt-1" role="status">
          Could not save result to the database. Check the <code>pagespeed_reports</code> migration.
        </p>
      ) : null}

      {loading && !report ? (
        <p className="admin-perf-loading admin-mt-1">
          Google PageSpeed Insights is running… this can take up to a minute.
        </p>
      ) : null}

      {report ? (
        <div className="admin-perf-results admin-mt-1">
          <PsiReportPanel report={report} deltaLabel={delta?.label} deltaTone={delta?.tone} />

          {report.opportunities.length > 0 ? (
            <div className="admin-perf-opportunities">
              <h3 className="admin-perf-opportunities-title">Top opportunities</h3>
              <ul className="admin-perf-opportunity-list admin-m-0">
                {report.opportunities.map((o) => (
                  <li key={o.id}>
                    <span className="admin-perf-opportunity-name">{o.title}</span>
                    {o.displayValue ? (
                      <span className="admin-perf-opportunity-save">{o.displayValue}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <a
            href={report.reportLink}
            target="_blank"
            rel="noopener noreferrer"
            className="admin-btn-secondary admin-perf-external-link"
          >
            View full report on PageSpeed Insights ↗
          </a>
        </div>
      ) : null}
    </article>
  );
}

function HistoryTable({ rows }: { rows: PageSpeedHistoryRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="admin-muted admin-m-0">
        No saved tests yet. Run a mobile or desktop test — results stay here for comparison.
      </p>
    );
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-perf-history-table">
        <caption className="admin-sr-only">PageSpeed test history</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Device</th>
            <th scope="col">Perf.</th>
            <th scope="col">Δ Perf.</th>
            <th scope="col">A11y</th>
            <th scope="col">SEO</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const older = rows[index + 1];
            const sameStrategyOlder =
              older && older.strategy === row.strategy ? older.performance : null;
            const d = performanceDelta(row.performance, sameStrategyOlder);

            return (
              <tr key={row.id}>
                <td>{formatTestTime(row.fetchedAt)}</td>
                <td>{row.strategy === "mobile" ? "Mobile" : "Desktop"}</td>
                <td>
                  {row.performance != null ? (
                    <span
                      className={`admin-perf-score-chip admin-perf-score-chip--${psiScoreTone(row.performance)}`}
                    >
                      {row.performance}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {d ? (
                    <span className={`admin-perf-delta-pill admin-perf-delta-pill--${d.tone}`}>
                      {d.tone === "up" ? "↑" : d.tone === "down" ? "↓" : "→"} {formatDeltaShort(d.label)}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {row.accessibility != null ? (
                    <span
                      className={`admin-perf-score-chip admin-perf-score-chip--${psiScoreTone(row.accessibility)}`}
                    >
                      {row.accessibility}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {row.seo != null ? (
                    <span
                      className={`admin-perf-score-chip admin-perf-score-chip--${psiScoreTone(row.seo)}`}
                    >
                      {row.seo}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPerformancePanel() {
  const [config, setConfig] = useState<Config | null>(null);
  const [mobile, setMobile] = useState<StrategyState>(EMPTY);
  const [desktop, setDesktop] = useState<StrategyState>(EMPTY);
  const [history, setHistory] = useState<PageSpeedHistoryRow[]>([]);
  const [runningBoth, setRunningBoth] = useState(false);

  const loadConfig = useCallback(async () => {
    const res = await fetch("/api/admin/performance/pagespeed", { cache: "no-store" });
    const json = (await res.json()) as Config;
    setConfig(json);
    setHistory(json.history ?? []);
    setMobile((s) => ({
      ...s,
      report: json.latest?.mobile ?? null,
      previousReport: json.previous?.mobile ?? null,
    }));
    setDesktop((s) => ({
      ...s,
      report: json.latest?.desktop ?? null,
      previousReport: json.previous?.desktop ?? null,
    }));
  }, []);

  useEffect(() => {
    void loadConfig().catch(() =>
      setConfig({
        shopUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergasports.com").replace(/\/$/, ""),
        apiKeyConfigured: false,
        latest: { mobile: null, desktop: null },
        previous: { mobile: null, desktop: null },
        history: [],
      }),
    );
  }, [loadConfig]);

  const runTest = useCallback(
    async (strategy: PageSpeedStrategy) => {
      const setState = strategy === "mobile" ? setMobile : setDesktop;
      setState((s) => ({ ...s, loading: true, error: "", persistWarning: false }));

      try {
        const res = await fetch("/api/admin/performance/pagespeed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ strategy, url: config?.shopUrl }),
        });
        const json = (await res.json()) as PageSpeedReport & {
          error?: string;
          previousReport?: PageSpeedReport | null;
          persisted?: boolean;
        };
        if (!res.ok) {
          setState({ ...EMPTY, loading: false, error: json.error ?? "Test failed" });
          return;
        }
        setState({
          report: json,
          previousReport: json.previousReport ?? null,
          loading: false,
          error: "",
          persistWarning: json.persisted === false,
        });
        await loadConfig();
      } catch {
        setState({ ...EMPTY, loading: false, error: "Network error" });
      }
    },
    [config?.shopUrl, loadConfig],
  );

  const runBoth = useCallback(async () => {
    setRunningBoth(true);
    await runTest("mobile");
    await runTest("desktop");
    setRunningBoth(false);
  }, [runTest]);

  const anyLoading = mobile.loading || desktop.loading || runningBoth;
  const shopUrl = config?.shopUrl ?? "…";

  return (
    <div className="admin-perf-view">
      <header className="admin-perf-head">
        <div>
          <p className="admin-live-view-sub admin-m-0">
            Store speed via{" "}
            <a
              href="https://developers.google.com/speed/docs/insights/v5/get-started"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google PageSpeed Insights
            </a>{" "}
            (Lighthouse). Lab data from Google — not real-user CrUX on this page.
          </p>
          <p className="admin-perf-url admin-m-0 admin-mt-05">
            Test URL: <code>{shopUrl}</code>
          </p>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Each run is <strong>saved to Prisma</strong> — compare with previous runs after refresh.
          </p>
        </div>
        <div className="admin-perf-actions">
          <button
            type="button"
            className="admin-btn-primary"
            disabled={anyLoading}
            onClick={() => void runBoth()}
          >
            {runningBoth ? "Running both…" : "Test mobile + desktop"}
          </button>
        </div>
      </header>

      {!config?.apiKeyConfigured ? (
        <div className="admin-banner warn admin-mt-1" role="alert">
          <p className="admin-m-0">
            <strong>GOOGLE_PAGESPEED_API_KEY</strong> is not available on this server. Tests use
            Google&apos;s shared quota and fail with &quot;Quota exceeded&quot;. Add the same key as in{" "}
            <code>.env.local</code> under Vercel → Environment Variables → <strong>Production</strong>, then
            redeploy.
          </p>
        </div>
      ) : null}

      <div className="admin-perf-grid admin-mt-1">
        <StrategyCard
          strategy="mobile"
          label="Mobile"
          state={mobile}
          onRun={runTest}
          disabled={anyLoading}
        />
        <StrategyCard
          strategy="desktop"
          label="Desktop"
          state={desktop}
          onRun={runTest}
          disabled={anyLoading}
        />
      </div>

      <section className="admin-panel admin-perf-history admin-mt-1" aria-labelledby="perf-history-title">
        <h2 id="perf-history-title" className="admin-perf-history-title">
          Test history (latest {history.length || 0})
        </h2>
        <HistoryTable rows={history} />
      </section>
    </div>
  );
}

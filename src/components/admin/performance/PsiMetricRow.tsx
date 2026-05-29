import type { PageSpeedAuditMetric } from "@/lib/pagespeed-types";

import type { PsiScoreTone } from "@/components/admin/performance/PsiCategoryGauge";

type MetricStatus = PsiScoreTone | "neutral";

function metricStatus(id: string, metric: PageSpeedAuditMetric | null): MetricStatus {
  const v = metric?.numericValue;
  if (v == null) {
    return "neutral";
  }
  switch (id) {
    case "lcp":
      return v <= 2500 ? "good" : v <= 4000 ? "ok" : "poor";
    case "fcp":
      return v <= 1800 ? "good" : v <= 3000 ? "ok" : "poor";
    case "cls":
      return v <= 0.1 ? "good" : v <= 0.25 ? "ok" : "poor";
    case "tbt":
      return v <= 200 ? "good" : v <= 600 ? "ok" : "poor";
    case "inp":
      return v <= 200 ? "good" : v <= 500 ? "ok" : "poor";
    case "speedIndex":
      return v <= 3400 ? "good" : v <= 5800 ? "ok" : "poor";
    case "tti":
      return v <= 3800 ? "good" : v <= 7300 ? "ok" : "poor";
    default:
      return "neutral";
  }
}

type PsiMetricRowProps = {
  id: string;
  title: string;
  metric: PageSpeedAuditMetric | null;
};

export default function PsiMetricRow({ id, title, metric }: PsiMetricRowProps) {
  const status = metricStatus(id, metric);

  return (
    <div className="psi-metric-row">
      <span className={`psi-metric-icon psi-metric-icon--${status}`} aria-hidden />
      <span className="psi-metric-name">{title}</span>
      <span className="psi-metric-value">{metric?.displayValue ?? "—"}</span>
    </div>
  );
}

export function psiCwvAssessment(metrics: {
  lcp: PageSpeedAuditMetric | null;
  cls: PageSpeedAuditMetric | null;
  fcp?: PageSpeedAuditMetric | null;
}): "passed" | "failed" | "unknown" {
  const lcpOk = metricStatus("lcp", metrics.lcp) === "good";
  const clsOk = metricStatus("cls", metrics.cls) === "good";
  if (metrics.lcp == null && metrics.cls == null) {
    return "unknown";
  }
  return lcpOk && clsOk ? "passed" : "failed";
}

import type { PageSpeedReport } from "@/lib/pagespeed-types";

import PsiCategoryGauge from "@/components/admin/performance/PsiCategoryGauge";
import PsiMetricRow, { psiCwvAssessment } from "@/components/admin/performance/PsiMetricRow";

type PsiReportPanelProps = {
  report: PageSpeedReport;
  deltaLabel?: string | null;
  deltaTone?: "up" | "down" | "same";
};

export default function PsiReportPanel({ report, deltaLabel, deltaTone }: PsiReportPanelProps) {
  const cwv = psiCwvAssessment({
    lcp: report.coreWebVitals.lcp,
    cls: report.coreWebVitals.cls,
    fcp: report.coreWebVitals.fcp,
  });

  return (
    <div className="psi-report">
      <div className="psi-report-meta">
        <p className="psi-report-url admin-m-0">
          <span className="psi-report-url-text">{report.analyzedUrl}</span>
        </p>
        {deltaLabel ? (
          <p className={`psi-report-delta psi-report-delta--${deltaTone ?? "same"} admin-m-0`}>
            {deltaLabel}
          </p>
        ) : null}
      </div>

      <div className="psi-gauge-row" aria-label="Lighthouse category scores">
        <PsiCategoryGauge score={report.categories.performance} label="Performance" />
        <PsiCategoryGauge score={report.categories.accessibility} label="Accessibility" />
        <PsiCategoryGauge score={report.categories.bestPractices} label="Best Practices" />
        <PsiCategoryGauge score={report.categories.seo} label="SEO" />
      </div>

      <section className="psi-section" aria-labelledby="psi-cwv-heading">
        <h3 id="psi-cwv-heading" className="psi-section-title">
          Core Web Vitals assessment
          {cwv === "passed" ? (
            <span className="psi-cwv-badge psi-cwv-badge--pass">Passed</span>
          ) : cwv === "failed" ? (
            <span className="psi-cwv-badge psi-cwv-badge--fail">Needs improvement</span>
          ) : (
            <span className="psi-cwv-badge psi-cwv-badge--na">—</span>
          )}
        </h3>
        <div className="psi-metric-list">
          <PsiMetricRow id="lcp" title="Largest Contentful Paint" metric={report.coreWebVitals.lcp} />
          <PsiMetricRow id="fcp" title="First Contentful Paint" metric={report.coreWebVitals.fcp} />
          <PsiMetricRow id="cls" title="Cumulative Layout Shift" metric={report.coreWebVitals.cls} />
          <PsiMetricRow id="tbt" title="Total Blocking Time" metric={report.coreWebVitals.tbt} />
        </div>
      </section>

      <section className="psi-section" aria-labelledby="psi-lab-heading">
        <h3 id="psi-lab-heading" className="psi-section-title">
          Lab data
        </h3>
        <div className="psi-metric-list">
          <PsiMetricRow id="speedIndex" title="Speed Index" metric={report.coreWebVitals.speedIndex} />
          <PsiMetricRow id="tti" title="Time to Interactive" metric={report.coreWebVitals.tti} />
        </div>
      </section>
    </div>
  );
}

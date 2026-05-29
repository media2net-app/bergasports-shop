export type PageSpeedStrategy = "mobile" | "desktop";

export type PageSpeedAuditMetric = {
  id: string;
  title: string;
  displayValue: string | null;
  numericValue: number | null;
  score: number | null;
};

export type PageSpeedOpportunity = {
  id: string;
  title: string;
  displayValue: string | null;
  description: string;
};

export type PageSpeedCategoryScores = {
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
};

export type PageSpeedReport = {
  strategy: PageSpeedStrategy;
  url: string;
  analyzedUrl: string;
  fetchedAt: string;
  categories: PageSpeedCategoryScores;
  coreWebVitals: {
    fcp: PageSpeedAuditMetric | null;
    lcp: PageSpeedAuditMetric | null;
    tbt: PageSpeedAuditMetric | null;
    cls: PageSpeedAuditMetric | null;
    speedIndex: PageSpeedAuditMetric | null;
    tti: PageSpeedAuditMetric | null;
  };
  opportunities: PageSpeedOpportunity[];
  reportLink: string;
  cruxAvailable: boolean;
};

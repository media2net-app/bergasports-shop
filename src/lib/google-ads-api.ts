import "server-only";

import { getRuntimeSetting } from "@/lib/site-settings-db";
import type { DashboardPeriod } from "@/lib/dashboard-period";
import type { MarketingCampaignRow } from "@/lib/marketing-channel-insights-shared";

const ADS_API_VERSION = "v18";

export type GoogleAdsApiCredentials = {
  developerToken: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  customerId: string;
  loginCustomerId: string;
};

export type GoogleAdsPeriodMetrics = {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
  campaigns: MarketingCampaignRow[];
  period: DashboardPeriod;
  dateRangeLabel: string;
  currencyCode: string | null;
  fetchedAt: string;
};

function normalizeCustomerId(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

export async function getGoogleAdsApiCredentials(): Promise<GoogleAdsApiCredentials | null> {
  const [developerToken, clientId, clientSecret, refreshToken, customerId, loginCustomerId] =
    await Promise.all([
      getRuntimeSetting("GOOGLE_ADS_DEVELOPER_TOKEN"),
      getRuntimeSetting("GOOGLE_ADS_CLIENT_ID"),
      getRuntimeSetting("GOOGLE_ADS_CLIENT_SECRET"),
      getRuntimeSetting("GOOGLE_ADS_REFRESH_TOKEN"),
      getRuntimeSetting("GOOGLE_ADS_CUSTOMER_ID"),
      getRuntimeSetting("GOOGLE_ADS_LOGIN_CUSTOMER_ID"),
    ]);

  const normalizedCustomer = normalizeCustomerId(customerId);
  if (
    !developerToken.trim() ||
    !clientId.trim() ||
    !clientSecret.trim() ||
    !refreshToken.trim() ||
    !normalizedCustomer
  ) {
    return null;
  }

  return {
    developerToken: developerToken.trim(),
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
    refreshToken: refreshToken.trim(),
    customerId: normalizedCustomer,
    loginCustomerId: normalizeCustomerId(loginCustomerId),
  };
}

export async function getGoogleAdsApiStatus(): Promise<{
  configured: boolean;
  missing: string[];
  customerIdMasked: string | null;
}> {
  const keys = [
    "GOOGLE_ADS_DEVELOPER_TOKEN",
    "GOOGLE_ADS_CLIENT_ID",
    "GOOGLE_ADS_CLIENT_SECRET",
    "GOOGLE_ADS_REFRESH_TOKEN",
    "GOOGLE_ADS_CUSTOMER_ID",
  ] as const;

  const values = await Promise.all(keys.map((key) => getRuntimeSetting(key)));
  const missing = keys.filter((key, i) => !values[i]?.trim());
  const customerId = normalizeCustomerId(values[4] ?? "");
  return {
    configured: missing.length === 0,
    missing: [...missing],
    customerIdMasked: customerId
      ? `${customerId.slice(0, 3)}…${customerId.slice(-3)}`
      : null,
  };
}

function periodToAdsDateRange(period: DashboardPeriod): { during: string; label: string } {
  switch (period) {
    case "today":
      return { during: "TODAY", label: "Vandaag" };
    case "7d":
      return { during: "LAST_7_DAYS", label: "Laatste 7 dagen" };
    case "year":
      return { during: "THIS_YEAR", label: "Dit jaar" };
    case "all":
    case "30d":
    default:
      return { during: "LAST_30_DAYS", label: "Laatste 30 dagen" };
  }
}

async function getAccessToken(creds: GoogleAdsApiCredentials): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    refresh_token: creds.refreshToken,
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const json = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(
      json.error_description || json.error || `Google OAuth token mislukt (${res.status})`,
    );
  }
  return json.access_token;
}

type AdsSearchRow = {
  customer?: { currencyCode?: string };
  campaign?: { id?: string; name?: string; status?: string };
  metrics?: {
    costMicros?: string;
    impressions?: string;
    clicks?: string;
    conversions?: number | string;
    conversionsValue?: number | string;
  };
};

async function searchGoogleAds(
  creds: GoogleAdsApiCredentials,
  accessToken: string,
  query: string,
): Promise<AdsSearchRow[]> {
  const url = `https://googleads.googleapis.com/${ADS_API_VERSION}/customers/${creds.customerId}/googleAds:searchStream`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": creds.developerToken,
    "Content-Type": "application/json",
  };
  if (creds.loginCustomerId) {
    headers["login-customer-id"] = creds.loginCustomerId;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    let message = `Google Ads API ${res.status}`;
    try {
      const err = JSON.parse(text) as { error?: { message?: string; status?: string } };
      if (err.error?.message) {
        message = err.error.message;
      }
    } catch {
      if (text.trim()) {
        message = text.slice(0, 280);
      }
    }
    throw new Error(message);
  }

  if (!text.trim()) {
    return [];
  }

  const parsed = JSON.parse(text) as Array<{ results?: AdsSearchRow[] }> | { results?: AdsSearchRow[] };
  if (Array.isArray(parsed)) {
    return parsed.flatMap((chunk) => chunk.results ?? []);
  }
  return parsed.results ?? [];
}

function microsToAmount(micros: string | undefined): number {
  const n = Number(micros ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n / 1_000_000) * 100) / 100;
}

function toNumber(value: number | string | undefined): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function mapCampaignStatus(status: string | undefined): MarketingCampaignRow["status"] {
  const s = (status ?? "").toUpperCase();
  if (s === "PAUSED") return "paused";
  if (s === "REMOVED" || s === "ENDED") return "ended";
  return "active";
}

/** Haal account + campaign metrics op voor de gekozen periode. */
export async function fetchGoogleAdsPeriodMetrics(
  period: DashboardPeriod,
): Promise<GoogleAdsPeriodMetrics> {
  const creds = await getGoogleAdsApiCredentials();
  if (!creds) {
    throw new Error("Google Ads API is niet geconfigureerd.");
  }

  const { during, label } = periodToAdsDateRange(period);
  const accessToken = await getAccessToken(creds);

  const accountQuery = `
    SELECT
      customer.currency_code,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value
    FROM customer
    WHERE segments.date DURING ${during}
  `;

  const campaignQuery = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date DURING ${during}
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 25
  `;

  const [accountRows, campaignRows] = await Promise.all([
    searchGoogleAds(creds, accessToken, accountQuery),
    searchGoogleAds(creds, accessToken, campaignQuery),
  ]);

  let spend = 0;
  let impressions = 0;
  let clicks = 0;
  let conversions = 0;
  let conversionValue = 0;
  let currencyCode: string | null = null;

  for (const row of accountRows) {
    spend += microsToAmount(row.metrics?.costMicros);
    impressions += toNumber(row.metrics?.impressions);
    clicks += toNumber(row.metrics?.clicks);
    conversions += toNumber(row.metrics?.conversions);
    conversionValue += toNumber(row.metrics?.conversionsValue);
    if (row.customer?.currencyCode) {
      currencyCode = row.customer.currencyCode;
    }
  }

  const campaigns: MarketingCampaignRow[] = campaignRows.map((row, index) => ({
    id: String(row.campaign?.id ?? `ads-${index}`),
    name: String(row.campaign?.name ?? "Campaign"),
    status: mapCampaignStatus(row.campaign?.status),
    budgetRon: 0,
    spendRon: microsToAmount(row.metrics?.costMicros),
    impressions: toNumber(row.metrics?.impressions),
    clicks: toNumber(row.metrics?.clicks),
    conversions: Math.round(toNumber(row.metrics?.conversions)),
    notes: "",
  }));

  return {
    spend: Math.round(spend * 100) / 100,
    impressions: Math.round(impressions),
    clicks: Math.round(clicks),
    conversions: Math.round(conversions * 100) / 100,
    conversionValue: Math.round(conversionValue * 100) / 100,
    campaigns,
    period,
    dateRangeLabel: label,
    currencyCode,
    fetchedAt: new Date().toISOString(),
  };
}

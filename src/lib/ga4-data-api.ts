import "server-only";

import { getRuntimeSetting } from "@/lib/site-settings-db";
import type { DashboardPeriod } from "@/lib/dashboard-period";
import { getDashboardPeriodRange } from "@/lib/dashboard-period";

export type Ga4Credentials = {
  propertyId: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export type Ga4PeriodMetrics = {
  sessions: number;
  totalUsers: number;
  purchaseRevenue: number;
  transactions: number;
  period: DashboardPeriod;
  dateRangeLabel: string;
  fetchedAt: string;
};

function normalizePropertyId(raw: string): string {
  return raw.trim().replace(/^properties\//i, "");
}

export async function getGa4ApiCredentials(): Promise<Ga4Credentials | null> {
  const [propertyId, clientId, clientSecret, refreshToken] = await Promise.all([
    getRuntimeSetting("GA4_PROPERTY_ID"),
    getRuntimeSetting("GOOGLE_ADS_CLIENT_ID"),
    getRuntimeSetting("GOOGLE_ADS_CLIENT_SECRET"),
    getRuntimeSetting("GOOGLE_ADS_REFRESH_TOKEN"),
  ]);

  const pid = normalizePropertyId(propertyId);
  if (!pid || !clientId.trim() || !clientSecret.trim() || !refreshToken.trim()) {
    return null;
  }

  return {
    propertyId: pid,
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
    refreshToken: refreshToken.trim(),
  };
}

export async function getGa4ApiStatus(): Promise<{
  configured: boolean;
  missing: string[];
  propertyId: string | null;
}> {
  const propertyId = normalizePropertyId(await getRuntimeSetting("GA4_PROPERTY_ID"));
  const [clientId, clientSecret, refreshToken] = await Promise.all([
    getRuntimeSetting("GOOGLE_ADS_CLIENT_ID"),
    getRuntimeSetting("GOOGLE_ADS_CLIENT_SECRET"),
    getRuntimeSetting("GOOGLE_ADS_REFRESH_TOKEN"),
  ]);

  const missing: string[] = [];
  if (!propertyId) missing.push("GA4_PROPERTY_ID");
  if (!clientId.trim()) missing.push("GOOGLE_ADS_CLIENT_ID");
  if (!clientSecret.trim()) missing.push("GOOGLE_ADS_CLIENT_SECRET");
  if (!refreshToken.trim()) missing.push("GOOGLE_ADS_REFRESH_TOKEN");

  return {
    configured: missing.length === 0,
    missing,
    propertyId: propertyId || null,
  };
}

function periodToGa4Dates(period: DashboardPeriod): {
  startDate: string;
  endDate: string;
  label: string;
} {
  const { start, end } = getDashboardPeriodRange(period);
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  if (!start) {
    return {
      startDate: "2020-01-01",
      endDate: fmt(today),
      label: "Alles",
    };
  }

  const endInclusive = end ? new Date(end.getTime() - 1) : today;
  const labels: Record<DashboardPeriod, string> = {
    today: "Vandaag",
    "7d": "Laatste 7 dagen",
    "30d": "Laatste 30 dagen",
    year: "Dit jaar",
    all: "Alles",
  };

  return {
    startDate: fmt(start),
    endDate: fmt(endInclusive),
    label: labels[period],
  };
}

async function getAccessToken(creds: Ga4Credentials): Promise<string> {
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

/** GA4 Data API — sessions, users, purchase revenue (zelfde OAuth als Ads). */
export async function fetchGa4PeriodMetrics(period: DashboardPeriod): Promise<Ga4PeriodMetrics> {
  const creds = await getGa4ApiCredentials();
  if (!creds) {
    throw new Error("GA4 Data API is niet geconfigureerd (property + OAuth).");
  }

  const { startDate, endDate, label } = periodToGa4Dates(period);
  const accessToken = await getAccessToken(creds);

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${creds.propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "purchaseRevenue" },
          { name: "transactions" },
        ],
      }),
      cache: "no-store",
    },
  );

  const json = (await res.json()) as {
    error?: { message?: string };
    rows?: Array<{ metricValues?: Array<{ value?: string }> }>;
  };

  if (!res.ok) {
    throw new Error(json.error?.message || `GA4 Data API ${res.status}`);
  }

  const values = json.rows?.[0]?.metricValues ?? [];
  const num = (i: number) => {
    const n = Number(values[i]?.value ?? 0);
    return Number.isFinite(n) ? n : 0;
  };

  return {
    sessions: Math.round(num(0)),
    totalUsers: Math.round(num(1)),
    purchaseRevenue: Math.round(num(2) * 100) / 100,
    transactions: Math.round(num(3)),
    period,
    dateRangeLabel: label,
    fetchedAt: new Date().toISOString(),
  };
}

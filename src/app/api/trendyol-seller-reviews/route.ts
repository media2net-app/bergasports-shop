import { NextResponse } from "next/server";
import { getTrendyolSellerReviewsFallback } from "@/lib/trendyol-seller-reviews-fallback";
import { fetchTrendyolSellerProductReviews } from "@/lib/trendyol-seller-reviews-fetch";

function parseRates(param: string | null): number[] {
  if (!param?.trim()) {
    return [5];
  }
  return param
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => n >= 1 && n <= 5);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(0, Number(searchParams.get("page") ?? "0") || 0);
  const pageSize = Math.min(50, Math.max(5, Number(searchParams.get("size") ?? "15") || 15));
  const rates = parseRates(searchParams.get("rates"));

  try {
    const payload = await fetchTrendyolSellerProductReviews({ page, pageSize, rates });
    return NextResponse.json(
      { ...payload, fromCache: false },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
        },
      },
    );
  } catch {
    const cached = getTrendyolSellerReviewsFallback(page, pageSize);
    return NextResponse.json(cached, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
      },
    });
  }
}

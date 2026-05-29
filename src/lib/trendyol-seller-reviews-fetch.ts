const DEFAULT_PROFILE_URL =
  "https://www.trendyol.com/ro/store/profile/e-store-house-m-1185891";
const DEFAULT_MERCHANT_ID = 1185891;
const DEFAULT_CULTURE = "ro-RO";
const GATEWAY = "https://apigw.trendyol.com/discovery-sellerstore-gateway-service";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export type TrendyolProductReviewDto = {
  id: number;
  userFullName: string;
  showUserName: boolean;
  commentDateISOType: string;
  comment: string;
  rate: number;
  product?: { title?: string };
};

export type TrendyolSellerReviewsPayload = {
  sellerScore: number;
  sellerName: string;
  merchantId: number;
  summary: {
    averageRating: number;
    totalRatingCount: number;
    totalCommentCount: number;
    fiveStarCount: number;
  };
  reviews: TrendyolProductReviewDto[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalElements: number;
  /** API: true când răspunsul vine din cache local (Trendyol indisponibil). */
  fromCache?: boolean;
};

function cookieHeaderFromResponse(res: Response): string {
  const anyHeaders = res.headers as unknown as { getSetCookie?: () => string[] };
  const list = typeof anyHeaders.getSetCookie === "function" ? anyHeaders.getSetCookie() : null;
  if (list?.length) {
    return list.map((c) => c.split(";")[0]).filter(Boolean).join("; ");
  }
  const single = res.headers.get("set-cookie");
  if (!single) {
    return "";
  }
  return single
    .split(/,(?=[^;]+?=)/)
    .map((p) => p.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

function parseSellerMetaFromProfileHtml(html: string): { score: number; name: string } {
  try {
    const needle = 'window["__ss-header__PROPS"]=';
    const start = html.indexOf(needle);
    if (start < 0) {
      throw new Error("missing __ss-header__PROPS");
    }
    let i = start + needle.length;
    while (i < html.length && html[i] !== "{") {
      i++;
    }
    let depth = 0;
    const st = i;
    for (; i < html.length; i++) {
      const c = html[i];
      if (c === "{") {
        depth++;
      } else if (c === "}") {
        depth--;
        if (depth === 0) {
          const json = JSON.parse(html.slice(st, i + 1)) as {
            data?: { store?: { meta?: { seller?: { score?: number; name?: string } } } };
          };
          const seller = json.data?.store?.meta?.seller;
          if (seller && typeof seller.score === "number") {
            return { score: seller.score, name: seller.name ?? "Bergasports" };
          }
          break;
        }
      }
    }
  } catch {
    /* fall through */
  }
  const scoreM = html.match(/class="score-actual"[^>]*>([0-9]+(?:\.[0-9]+)?)</);
  return {
    score: scoreM ? Number(scoreM[1]) : 0,
    name: "Bergasports",
  };
}

function buildReviewsUrl(params: {
  merchantId: number;
  culture: string;
  page: number;
  pageSize: number;
  rates: number[];
}): string {
  const q = new URLSearchParams({
    sellerId: String(params.merchantId),
    page: String(params.page),
    size: String(params.pageSize),
    culture: params.culture,
  });
  if (params.rates.length) {
    q.set("rates", params.rates.join(","));
  }
  return `${GATEWAY}/api/ugc/product-reviews?${q.toString()}`;
}

function mapReview(r: Record<string, unknown>): TrendyolProductReviewDto {
  const product = r.product as { title?: string } | undefined;
  return {
    id: Number(r.id),
    userFullName: String(r.userFullName ?? ""),
    showUserName: Boolean(r.showUserName),
    commentDateISOType: String(r.commentDateISOType ?? ""),
    comment: String(r.comment ?? ""),
    rate: Number(r.rate ?? 0),
    product: product?.title ? { title: product.title } : undefined,
  };
}

export async function fetchTrendyolSellerProductReviews(options: {
  profileUrl?: string;
  merchantId?: number;
  culture?: string;
  page: number;
  pageSize: number;
  rates: number[];
}): Promise<TrendyolSellerReviewsPayload> {
  const profileUrl = options.profileUrl ?? process.env.TRENDYOL_STORE_PROFILE_URL ?? DEFAULT_PROFILE_URL;
  const envMid = Number(process.env.TRENDYOL_MERCHANT_ID);
  const merchantId =
    Number.isFinite(envMid) && envMid > 0 ? envMid : options.merchantId ?? DEFAULT_MERCHANT_ID;
  const culture = options.culture ?? process.env.TRENDYOL_STORE_CULTURE ?? DEFAULT_CULTURE;

  const profileRes = await fetch(profileUrl, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.8",
    },
    redirect: "follow",
  });

  if (!profileRes.ok) {
    throw new Error(`Trendyol profile HTTP ${profileRes.status}`);
  }

  const html = await profileRes.text();
  const { score: sellerScore, name: sellerName } = parseSellerMetaFromProfileHtml(html);
  const cookies = cookieHeaderFromResponse(profileRes);

  const reviewsUrl = buildReviewsUrl({
    merchantId,
    culture,
    page: options.page,
    pageSize: options.pageSize,
    rates: options.rates,
  });

  const reviewsRes = await fetch(reviewsUrl, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
      Referer: profileUrl,
      Origin: "https://www.trendyol.com",
      Cookie: cookies,
    },
  });

  if (!reviewsRes.ok) {
    const errText = await reviewsRes.text().catch(() => "");
    throw new Error(`Trendyol reviews HTTP ${reviewsRes.status}: ${errText.slice(0, 200)}`);
  }

  const body = (await reviewsRes.json()) as {
    contentSummary?: {
      averageRating?: number;
      totalRatingCount?: number;
      totalCommentCount?: number;
      ratingCounts?: { rate: number; count: number }[];
    };
    productReviews?: {
      page?: number;
      size?: number;
      totalPages?: number;
      totalElements?: number;
      content?: Record<string, unknown>[];
    };
  };

  const summary = body.contentSummary ?? {};
  const fiveStarCount = summary.ratingCounts?.find((x) => x.rate === 5)?.count ?? 0;
  const pr = body.productReviews ?? {};
  const rawList = Array.isArray(pr.content) ? pr.content : [];

  return {
    sellerScore,
    sellerName,
    merchantId,
    summary: {
      averageRating: Number(summary.averageRating ?? 0),
      totalRatingCount: Number(summary.totalRatingCount ?? 0),
      totalCommentCount: Number(summary.totalCommentCount ?? 0),
      fiveStarCount,
    },
    reviews: rawList.map(mapReview),
    page: Number(pr.page ?? options.page),
    pageSize: Number(pr.size ?? options.pageSize),
    totalPages: Number(pr.totalPages ?? 0),
    totalElements: Number(pr.totalElements ?? rawList.length),
  };
}

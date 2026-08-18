import type { ReactNode } from "react";

import GoldStars from "@/components/ui/GoldStars";
import type { GoogleReviewQuote, GoogleReviewsPublic } from "@/lib/google-reviews-types";

function GoogleMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function formatScore(score: number): string {
  return score.toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatReviewCount(count: number | null): string | null {
  if (!count) return null;
  return count === 1 ? "1 beoordeling" : `${count.toLocaleString("nl-NL")} beoordelingen`;
}

function quoteGridClass(count: number): string {
  if (count >= 4) return "sm:grid-cols-2 xl:grid-cols-4";
  if (count === 3) return "sm:grid-cols-3";
  if (count === 2) return "sm:grid-cols-2";
  return "";
}

function Quote({ quote, lines }: { quote: GoogleReviewQuote; lines: "3" | "4" }) {
  return (
    <figure>
      <GoldStars rating={quote.rating} size="sm" />
      <blockquote
        className={`mt-2.5 text-sm leading-relaxed text-[var(--foreground)]/75 ${
          lines === "3" ? "line-clamp-3" : "line-clamp-4"
        }`}
      >
        “{quote.text}”
      </blockquote>
      <figcaption className="mt-3 text-xs font-semibold text-[var(--foreground)]">{quote.author}</figcaption>
    </figure>
  );
}

function ScoreCluster({
  data,
  score,
  countLabel,
  compact,
}: {
  data: GoogleReviewsPublic;
  score: number | null;
  countLabel: string | null;
  compact: boolean;
}) {
  const showGoogleMark = data.quotesSource !== "curated" || data.ratingSource !== "none";
  const title =
    data.quotesSource === "google"
      ? "Google-reviews"
      : data.quotesSource === "curated"
        ? "Klanten over Bergasports"
        : "Reviews op Google";

  return (
    <div className={`flex min-w-0 flex-wrap items-center ${compact ? "gap-x-2.5 gap-y-1" : "gap-x-3 gap-y-1.5"}`}>
      {showGoogleMark ? <GoogleMark className={compact ? "h-4 w-4" : "h-5 w-5"} /> : null}
      {score != null ? (
        <>
          <p
            className={`font-[family-name:var(--font-heading)] leading-none tracking-tight ${
              compact ? "text-lg" : "text-2xl"
            }`}
          >
            {formatScore(score)}
          </p>
          <GoldStars rating={score} size={compact ? "sm" : "md"} />
          {countLabel || !compact ? (
            <p className={compact ? "text-[11px] text-[var(--foreground)]/50" : "text-sm text-[var(--foreground)]/55"}>
              {countLabel ?? "Google-beoordeling"}
            </p>
          ) : null}
        </>
      ) : (
        <p
          className={
            compact
              ? "text-sm font-semibold"
              : "font-[family-name:var(--font-heading)] text-lg tracking-tight"
          }
        >
          {title}
        </p>
      )}
    </div>
  );
}

function GoogleLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="arrow-link inline-flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--foreground)]/65 transition hover:text-[var(--brand)]"
    >
      Bekijk op Google
      <span aria-hidden className="arrow-link-icon">
        →
      </span>
    </a>
  );
}

function Band({
  children,
  link,
  divided,
}: {
  children: ReactNode;
  link: ReactNode;
  divided: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
        divided ? "border-b border-[var(--brand-border)] pb-5" : ""
      }`}
    >
      {children}
      {link}
    </div>
  );
}

export default function GoogleReviewsView({
  data,
  variant = "home",
}: {
  data: GoogleReviewsPublic;
  variant?: "home" | "compact";
}) {
  const score = data.rating;
  const countLabel = formatReviewCount(data.ratingCount);
  const quotes = variant === "compact" ? data.quotes.slice(0, 1) : data.quotes.slice(0, 4);
  const link = <GoogleLink href={data.reviewsUrl} />;
  const cluster = (
    <ScoreCluster data={data} score={score} countLabel={countLabel} compact={variant === "compact"} />
  );

  if (variant === "compact") {
    const quote = quotes[0];
    return (
      <aside className="rounded-2xl border border-[var(--brand-border)] bg-white px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          {cluster}
          {link}
        </div>
        {quote ? (
          <div className="mt-3 border-t border-[var(--brand-border)] pt-3">
            <Quote quote={quote} lines="3" />
          </div>
        ) : null}
      </aside>
    );
  }

  return (
    <section aria-label="Google-beoordelingen">
      <Band link={link} divided={quotes.length > 0}>
        {cluster}
      </Band>

      {quotes.length > 0 ? (
        <>
          {data.quotesSource === "curated" && score != null ? (
            <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
              Klanten over Bergasports
            </p>
          ) : null}
          <ul
            className={`grid gap-x-8 sm:gap-y-8 ${quoteGridClass(quotes.length)} ${
              data.quotesSource === "curated" && score != null ? "mt-5" : "mt-7"
            } divide-y divide-[var(--brand-border)] sm:divide-y-0`}
          >
            {quotes.map((quote) => (
              <li key={quote.id} className="py-5 first:pt-0 sm:py-0">
                <Quote quote={quote} lines="4" />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

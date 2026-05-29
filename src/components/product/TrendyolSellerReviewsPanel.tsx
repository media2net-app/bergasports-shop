"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import trendyolReviewsFallback from "@/data/trendyol-seller-reviews-fallback.json";
import type { TrendyolProductReviewDto, TrendyolSellerReviewsPayload } from "@/lib/trendyol-seller-reviews-fetch";

const CLIENT_FALLBACK: TrendyolSellerReviewsPayload = {
  ...(trendyolReviewsFallback as TrendyolSellerReviewsPayload),
  fromCache: true,
};

function Stars({ value }: { value: number }) {
  const full = Math.round(Math.min(5, Math.max(0, value)));
  return (
    <span className="text-amber-500" aria-hidden>
      {"★".repeat(full)}
      <span className="text-[#e5dcc8]">{"★".repeat(5 - full)}</span>
    </span>
  );
}

function displayAuthor(r: TrendyolProductReviewDto): string {
  if (r.showUserName && r.userFullName.trim()) {
    return r.userFullName.trim();
  }
  if (r.userFullName.trim()) {
    return r.userFullName.trim();
  }
  return "Cumpărător verificat";
}

type Props = {
  className?: string;
};

export default function TrendyolSellerReviewsPanel({ className }: Props) {
  const [data, setData] = useState<TrendyolSellerReviewsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalReviews, setModalReviews] = useState<TrendyolProductReviewDto[]>([]);
  const [modalPage, setModalPage] = useState(0);
  const [modalHasMore, setModalHasMore] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/trendyol-seller-reviews?page=0&rates=5&size=15", {
          cache: "no-store",
        });
        const payload = (await res.json().catch(() => null)) as (TrendyolSellerReviewsPayload & { error?: string }) | null;
        if (!cancelled) {
          if (!res.ok || !payload || typeof payload !== "object") {
            setData(CLIENT_FALLBACK);
          } else if ("error" in payload && payload.error) {
            setData(CLIENT_FALLBACK);
          } else if (!Array.isArray(payload.reviews) || payload.reviews.length === 0) {
            setData(CLIENT_FALLBACK);
          } else {
            setData(payload);
          }
        }
      } catch {
        if (!cancelled) {
          setData(CLIENT_FALLBACK);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const slides = useMemo(() => data?.reviews ?? [], [data?.reviews]);
  const safeSlide = slides.length ? slide % slides.length : 0;

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }
    const t = window.setInterval(() => {
      setSlide((s) => (s + 1) % slides.length);
    }, 5200);
    return () => window.clearInterval(t);
  }, [slides.length]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) {
      return;
    }
    if (modalOpen) {
      el.showModal();
      document.body.style.overflow = "hidden";
    } else {
      el.close();
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  const openModal = useCallback(() => {
    if (!data) {
      return;
    }
    setModalReviews(data.reviews);
    setModalPage(0);
    setModalHasMore(data.totalPages > 1);
    setModalOpen(true);
  }, [data]);

  const loadMoreModal = useCallback(async () => {
    if (!data || modalLoading || !modalHasMore || data.fromCache) {
      return;
    }
    setModalLoading(true);
    try {
      const next = modalPage + 1;
      const res = await fetch(`/api/trendyol-seller-reviews?page=${next}&rates=5&size=20`, {
        cache: "no-store",
      });
      const payload = (await res.json().catch(() => null)) as TrendyolSellerReviewsPayload | null;
      if (!res.ok || !payload?.reviews?.length) {
        throw new Error("Nu s-au putut încărca recenziile");
      }
      setModalReviews((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        const merged = [...prev];
        for (const r of payload.reviews) {
          if (!seen.has(r.id)) {
            seen.add(r.id);
            merged.push(r);
          }
        }
        return merged;
      });
      setModalPage(next);
      setModalHasMore(next + 1 < payload.totalPages);
    } catch {
      setModalHasMore(false);
    } finally {
      setModalLoading(false);
    }
  }, [data, modalHasMore, modalLoading, modalPage]);

  if (loading) {
    return (
      <div
        className={`rounded-2xl border border-[#e5dcc8] bg-white/80 p-6 text-sm text-[var(--foreground)]/70 ${className ?? ""}`}
      >
        Se încarcă recenziile magazinului…
      </div>
    );
  }

  if (!data || data.reviews.length === 0) {
    return null;
  }

  const current = slides[safeSlide] ?? data.reviews[0];

  return (
    <section
      className={`rounded-2xl border border-[#e5dcc8] bg-white p-4 md:p-6 ${className ?? ""}`}
      aria-labelledby="trendyol-reviews-heading"
    >
      {data.fromCache ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Afișăm un scor și recenzii salvate local (cache), deoarece Trendyol nu răspunde momentan sau datele
          sunt incomplete. Scorul magazinului reflectă ultima valoare cunoscută; comanda pe acest site este
          separată de Trendyol.
        </p>
      ) : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2
            id="trendyol-reviews-heading"
            className="font-[family-name:var(--font-heading)] text-xl font-semibold text-[var(--foreground)] md:text-2xl"
          >
            Recenzii Trendyol — {data.sellerName}
          </h2>
          <p className="mt-1 text-sm text-[var(--foreground)]/70">
            Scor magazin pe Trendyol (livrare și serviciu). Recenziile afișate sunt pentru produsele
            comercializate acolo; comanda pe acest site este separată.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-[#049B24] px-4 py-3 text-white shadow-sm">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-90">Magazin</p>
            <p className="text-3xl font-bold leading-none">{data.sellerScore.toFixed(1)}</p>
            <p className="text-xs opacity-90">din 10</p>
          </div>
          <div className="h-10 w-px bg-white/30" />
          <div className="text-sm leading-snug">
            <p className="font-semibold">Produse (Trendyol)</p>
            <p className="opacity-90">
              {data.summary.averageRating.toFixed(1)} medie · {data.summary.totalRatingCount}{" "}
              evaluări
            </p>
            <p className="opacity-90">{data.summary.fiveStarCount} cu 5 stele</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--foreground)]">Recenziile recente cu 5 stele</p>
          <div className="flex gap-1">
            {slides.slice(0, 8).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                className={`h-2 w-2 rounded-full transition ${i === safeSlide ? "bg-[#96741f]" : "bg-[#e5dcc8]"}`}
                onClick={() => setSlide(i)}
              />
            ))}
          </div>
        </div>

        <div className="relative mt-3 overflow-hidden rounded-xl border border-[#e5dcc8] bg-[#faf8f4] p-4 md:p-5">
          <article className="min-h-[120px] md:min-h-[100px]" key={current.id}>
            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--foreground)]/80">
              <Stars value={current.rate} />
              <span className="font-semibold text-[var(--foreground)]">{displayAuthor(current)}</span>
              <span className="text-[var(--foreground)]/50">· {current.commentDateISOType}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">{current.comment}</p>
            {current.product?.title ? (
              <p className="mt-2 text-xs text-[var(--foreground)]/60">
                <span className="font-medium text-[var(--foreground)]/75">Produs:</span> {current.product.title}
              </p>
            ) : null}
          </article>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full bg-[#B38F27] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#96741f]"
            onClick={openModal}
          >
            Vezi toate recenziile cu 5 stele ({data.summary.fiveStarCount})
          </button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className="trendyol-reviews-dialog fixed left-1/2 top-1/2 z-[100] max-h-[min(85vh,720px)] w-[min(100vw-1.5rem,520px)] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-[#e5dcc8] bg-white p-0 text-[var(--foreground)] shadow-2xl outline-none [&:not([open])]:hidden [open]:flex [open]:flex-col"
        onClick={(e) => {
          if (e.target === dialogRef.current) {
            setModalOpen(false);
          }
        }}
        onClose={() => setModalOpen(false)}
        onCancel={(e) => {
          e.preventDefault();
          setModalOpen(false);
        }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e5dcc8] px-4 py-3 md:px-5">
          <div>
            <p className="font-[family-name:var(--font-heading)] text-lg font-semibold">
              Toate recenziile cu 5 stele
            </p>
            <p className="text-xs text-[var(--foreground)]/65">
              {data.sellerName} · magazin {data.sellerScore.toFixed(1)}/10 pe Trendyol
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-[#e5dcc8] px-3 py-1 text-sm font-medium text-[var(--foreground)] hover:bg-[#faf8f4]"
            onClick={() => setModalOpen(false)}
          >
            Închide
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-5">
          <ul className="space-y-4">
            {modalReviews.map((r) => (
              <li key={r.id} className="rounded-xl border border-[#e5dcc8] bg-[#faf8f4] p-3 md:p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--foreground)]/80">
                  <Stars value={r.rate} />
                  <span className="font-semibold text-[var(--foreground)]">{displayAuthor(r)}</span>
                  <span className="text-[var(--foreground)]/50">· {r.commentDateISOType}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed">{r.comment}</p>
                {r.product?.title ? (
                  <p className="mt-2 text-xs text-[var(--foreground)]/60">
                    <span className="font-medium">Produs:</span> {r.product.title}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          {modalHasMore ? (
            <div className="mt-4 pb-2 text-center">
              <button
                type="button"
                className="rounded-full border border-[#B38F27] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[#faf8f4] disabled:opacity-50"
                disabled={modalLoading}
                onClick={() => void loadMoreModal()}
              >
                {modalLoading ? "Se încarcă…" : "Încarcă mai multe"}
              </button>
            </div>
          ) : null}
        </div>
      </dialog>
    </section>
  );
}

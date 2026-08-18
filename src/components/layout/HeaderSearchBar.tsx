"use client";

import { startTransition, useCallback, useEffect, useId, useRef, useState } from "react";
import LocalizedLink from "@/components/locale/LocalizedLink";
import { useLocalizedHref } from "@/components/locale/ShopLanguagesProvider";
import { useRouter } from "next/navigation";

import OptimizedProductImage from "@/components/ui/OptimizedProductImage";
import { productPath } from "@/lib/product-slug";
import { trackTikTokSearch } from "@/lib/tiktok-pixel";

const MIN_CHARS = 3;
const DEBOUNCE_MS = 260;

type ShopSearchHit = {
  id: number;
  slug: string;
  name: string;
  priceLabel: string;
  image: string;
};

type Props = {
  /** Donkere header: lichte randen en tekst. */
  variant?: "light" | "dark";
  autoFocus?: boolean;
};

export default function HeaderSearchBar({ variant = "light", autoFocus = false }: Props) {
  const isDark = variant === "dark";
  const router = useRouter();
  const localizedHref = useLocalizedHref();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<ShopSearchHit[]>([]);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_CHARS) {
      startTransition(() => {
        setHits([]);
        setLoading(false);
        setOpen(false);
        setActive(-1);
      });
      return;
    }

    const ac = new AbortController();
    const t = window.setTimeout(async () => {
      setLoading(true);
      setOpen(false);
      setActive(-1);
      try {
        const res = await fetch(`/api/shop-search?q=${encodeURIComponent(q)}&limit=10`, {
          signal: ac.signal,
        });
        if (!res.ok) {
          setHits([]);
          setOpen(false);
          return;
        }
        const data = (await res.json()) as { hits?: ShopSearchHit[] };
        const next = Array.isArray(data.hits) ? data.hits : [];
        setHits(next);
        setOpen(q.length >= MIN_CHARS);
        if (next.length > 0) {
          trackTikTokSearch(q, next);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setHits([]);
          setOpen(false);
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [query]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
  }, [autoFocus]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActive(-1);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const goProduct = useCallback(
    (hit: ShopSearchHit) => {
      setOpen(false);
      setActive(-1);
      router.push(localizedHref(productPath(hit.slug)));
      inputRef.current?.blur();
    },
    [router, localizedHref],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && (!open || hits.length === 0) && query.trim().length >= MIN_CHARS) {
      return;
    }
    if (!open || hits.length === 0) {
      if (e.key === "Escape") {
        setOpen(false);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % hits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? hits.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0 && active < hits.length) {
      e.preventDefault();
      goProduct(hits[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  };

  const showPanel = open && !loading && hits.length > 0;
  const showEmpty = open && !loading && query.trim().length >= MIN_CHARS && hits.length === 0;

  return (
    <div ref={rootRef} className="relative z-[55] w-full">
      <form
        action={localizedHref("/shop")}
        method="get"
        className={`flex w-full items-center gap-2 rounded-full border px-4 py-2 shadow-sm ${
          isDark
            ? "border-white/20 bg-white/5"
            : "border-[#e5dcc8] bg-white"
        }`}
        role="search"
        onSubmit={() => {
          setOpen(false);
          setActive(-1);
        }}
      >
        <input
          ref={inputRef}
          type="search"
          name="q"
          role="combobox"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim().length >= MIN_CHARS) {
              setOpen(true);
            }
          }}
          onKeyDown={onKeyDown}
          placeholder="Zoek producten…"
          className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${
            isDark
              ? "text-white placeholder:text-white/45"
              : "text-[var(--foreground)] placeholder:text-[var(--foreground)]/45"
          }`}
          autoComplete="off"
          aria-label="Zoek producten"
          aria-expanded={showPanel || showEmpty}
          aria-controls={showPanel || showEmpty ? listId : undefined}
          aria-autocomplete="list"
        />
        <button
          type="submit"
          className={`shrink-0 rounded-full p-1.5 transition ${
            isDark ? "text-white/90 hover:bg-white/10" : "text-[var(--foreground)] hover:bg-[#faf8f5]"
          }`}
          aria-label="Zoeken"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3-3" strokeLinecap="round" />
          </svg>
        </button>
      </form>

      {loading && query.trim().length >= MIN_CHARS ? (
        <p className="pointer-events-none absolute left-0 right-0 top-full z-[60] mt-1 rounded-xl border border-[#e5dcc8] bg-white px-3 py-2 text-xs text-[var(--foreground)]/70 shadow-lg">
          Zoeken…
        </p>
      ) : null}

      {showPanel ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Zoekresultaten"
          className="absolute left-0 right-0 top-full z-[70] mt-1 max-h-[min(70vh,22rem)] overflow-y-auto rounded-xl border border-[#e5dcc8] bg-white py-1 shadow-2xl"
        >
          {hits.map((hit, idx) => (
            <li key={hit.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={idx === active}
                className={`flex w-full gap-3 px-3 py-2.5 text-left transition hover:bg-[#faf8f5] ${
                  idx === active ? "bg-[#faf8f5]" : ""
                }`}
                onMouseEnter={() => setActive(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  goProduct(hit);
                }}
              >
                <OptimizedProductImage
                  src={hit.image}
                  alt=""
                  variant="searchThumb"
                  wrapperClassName="h-12 w-12 shrink-0 rounded-lg border border-[#e5dcc8]"
                />
                <span className="min-w-0 flex-1">
                  <span className="title-2-lines block text-sm font-semibold text-[var(--foreground)]">{hit.name}</span>
                  <span className="mt-0.5 block text-xs font-bold text-[#96741f]">{hit.priceLabel}</span>
                </span>
              </button>
            </li>
          ))}
          <li className="border-t border-[#e5dcc8] px-3 py-2" role="presentation">
            <LocalizedLink
              href={`/shop?q=${encodeURIComponent(query.trim())}`}
              className="text-xs font-semibold text-[#96741f] underline underline-offset-2"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => {
                setOpen(false);
                setActive(-1);
              }}
            >
              Bekijk alle resultaten in de webshop
            </LocalizedLink>
          </li>
        </ul>
      ) : null}

      {showEmpty ? (
        <div
          id={listId}
          className="absolute left-0 right-0 top-full z-[60] mt-1 rounded-xl border border-[#e5dcc8] bg-white px-3 py-3 text-sm text-[var(--foreground)]/75 shadow-lg"
          role="status"
        >
          Geen producten gevonden. Probeer een andere term of{" "}
          <LocalizedLink
            href={`/shop?q=${encodeURIComponent(query.trim())}`}
            className="font-semibold text-[#96741f] underline"
            onMouseDown={(e) => e.stopPropagation()}
          >
            open de webshop
          </LocalizedLink>
          .
        </div>
      ) : null}
    </div>
  );
}

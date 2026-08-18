"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { AdminProductSearchHit } from "@/lib/admin-product-search-types";
import { formatProductPrice } from "@/lib/products";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 220;

export default function AdminProductTypeahead({
  onPick,
  placeholder,
  disabled,
  autoFocus,
  currency = "EUR",
}: {
  onPick: (hit: AdminProductSearchHit) => void;
  placeholder: string;
  disabled?: boolean;
  autoFocus?: boolean;
  currency?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<AdminProductSearchHit[]>([]);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_CHARS) {
      return;
    }

    const ac = new AbortController();
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/products/search?q=${encodeURIComponent(q)}&limit=10`, {
          signal: ac.signal,
        });
        const data = (await res.json()) as { hits?: AdminProductSearchHit[] };
        const next = Array.isArray(data.hits) ? data.hits : [];
        setHits(next);
        setOpen(true);
        setActive(next.length > 0 ? 0 : -1);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setHits([]);
          setOpen(true);
          setActive(-1);
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

  function pick(hit: AdminProductSearchHit) {
    onPick(hit);
    setQuery("");
    setHits([]);
    setOpen(false);
    setActive(-1);
    inputRef.current?.focus();
  }

  const q = query.trim();
  const ready = q.length >= MIN_CHARS;
  const showPanel = open && ready;
  const visibleHits = ready ? hits : [];

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (!showPanel || visibleHits.length === 0) {
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % visibleHits.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? visibleHits.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      const hit = visibleHits[active] ?? visibleHits[0];
      if (hit) {
        e.preventDefault();
        pick(hit);
      }
    }
  }

  return (
    <div ref={rootRef} className="admin-order-typeahead">
      <input
        ref={inputRef}
        className="admin-order-input"
        type="search"
        role="combobox"
        value={query}
        disabled={disabled}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (query.trim().length >= MIN_CHARS) {
            setOpen(true);
          }
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        aria-label={placeholder}
        aria-expanded={showPanel}
        aria-controls={showPanel ? listId : undefined}
        aria-autocomplete="list"
      />
      {showPanel ? (
        <ul id={listId} className="admin-order-suggest" role="listbox">
          {loading && visibleHits.length === 0 ? (
            <li className="admin-order-suggest-empty">Zoeken…</li>
          ) : visibleHits.length === 0 ? (
            <li className="admin-order-suggest-empty">Geen producten gevonden</li>
          ) : (
            visibleHits.map((hit, index) => (
              <li key={hit.id} role="option" aria-selected={index === active}>
                <button
                  type="button"
                  className={`admin-order-suggest-item${index === active ? " is-active" : ""}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => pick(hit)}
                >
                  <span className="admin-order-thumb admin-order-thumb--sm">
                    {hit.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={hit.image} alt="" loading="lazy" decoding="async" />
                    ) : null}
                  </span>
                  <span className="admin-order-suggest-copy">
                    <span className="admin-order-suggest-name">{hit.name}</span>
                    {hit.sku ? <span className="admin-order-suggest-sku">SKU {hit.sku}</span> : null}
                  </span>
                  <span className="admin-order-suggest-price">{formatProductPrice(hit.price, currency)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

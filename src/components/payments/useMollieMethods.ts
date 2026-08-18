"use client";

import { useEffect, useState } from "react";

import { fallbackShopMollieMethods, type MollieMethodPublic } from "@/lib/mollie-methods";

export type MollieMethodsState = {
  methods: MollieMethodPublic[];
  fallback: boolean;
  loading: boolean;
  configured: boolean;
};

function withPickerMethods(
  live: MollieMethodPublic[],
  fallback: boolean,
  configured: boolean,
): Omit<MollieMethodsState, "loading"> {
  const methods = live.length > 0 ? live : fallbackShopMollieMethods();
  return {
    methods,
    fallback: fallback || live.length === 0,
    configured,
  };
}

export function useMollieMethods(input: {
  amount: number;
  currency: string;
  country?: string;
}): MollieMethodsState {
  const enabled = Number.isFinite(input.amount) && input.amount > 0;
  const [fetched, setFetched] = useState<MollieMethodsState>({
    ...withPickerMethods([], true, true),
    loading: true,
  });

  useEffect(() => {
    if (!enabled) return;
    const ac = new AbortController();
    const qs = new URLSearchParams({
      amount: String(input.amount),
      currency: input.currency,
      country: input.country || "NL",
    });
    void fetch(`/api/mollie/methods?${qs}`, { signal: ac.signal, cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json()) as {
          methods?: MollieMethodPublic[];
          fallback?: boolean;
          configured?: boolean;
        };
        const list = Array.isArray(data.methods) ? data.methods : [];
        return {
          ...withPickerMethods(list, Boolean(data.fallback) || !res.ok, data.configured !== false),
          loading: false,
        } satisfies MollieMethodsState;
      })
      .then((next) => {
        if (!ac.signal.aborted) setFetched(next);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!ac.signal.aborted) {
          setFetched({ ...withPickerMethods([], true, true), loading: false });
        }
      });
    return () => ac.abort();
  }, [enabled, input.amount, input.currency, input.country]);

  if (!enabled) {
    return { ...withPickerMethods([], true, true), loading: false };
  }
  return fetched;
}

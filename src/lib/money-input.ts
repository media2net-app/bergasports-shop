/** EUR en overige admin-geldvelden: 2 cijfers achter de komma. */
export const EUR_DECIMALS = 2;

export function sanitizeMoneyInput(raw: string, maxDecimals = EUR_DECIMALS): string {
  const stripped = raw.replace(/[€\s]/gi, "").replace(/,/g, ".");
  let out = "";
  let seenDot = false;
  let decimals = 0;
  for (const ch of stripped) {
    if (ch >= "0" && ch <= "9") {
      if (seenDot) {
        if (decimals >= maxDecimals) continue;
        decimals += 1;
      }
      out += ch;
    } else if (ch === "." && !seenDot) {
      seenDot = true;
      out += ".";
    }
  }
  return out;
}

export function parseMoneyInput(raw: string): number | null {
  const t = sanitizeMoneyInput(raw).replace(/\.$/, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function roundMoney(value: number, decimals = EUR_DECIMALS): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function formatMoneyInput(
  value: number | string | null | undefined,
  options?: { allowEmpty?: boolean; decimals?: number; min?: number; max?: number },
): string {
  const allowEmpty = options?.allowEmpty ?? false;
  const decimals = options?.decimals ?? EUR_DECIMALS;
  const min = options?.min ?? 0;
  const max = options?.max;
  if (value == null || value === "") {
    return allowEmpty ? "" : (0).toFixed(decimals);
  }
  const n = typeof value === "number" ? value : parseMoneyInput(String(value));
  if (n == null || !Number.isFinite(n)) {
    return allowEmpty ? "" : (0).toFixed(decimals);
  }
  let next = Math.max(min, n);
  if (typeof max === "number" && Number.isFinite(max)) {
    next = Math.min(max, next);
  }
  return roundMoney(next, decimals).toFixed(decimals);
}

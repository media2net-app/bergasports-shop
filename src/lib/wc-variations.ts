/** Waarde uit Woo-label (bv. `Culoare:: bleu`, `Dimensiune: 90x200cm`, `: 90x200cm`). */
export function shortVariationLabel(full: string) {
  const trimmed = full.trim();
  if (!trimmed) {
    return trimmed;
  }
  const parts = trimmed
    .split(":")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length > 1) {
    return parts[parts.length - 1];
  }
  return trimmed.replace(/^:+\s*/, "").trim() || trimmed;
}

/** Klein → groot / goedkoop → duur: eerst prijs, daarna label (numeriek voor afmetingen). */
export function sortVariationsForDisplay<T extends { price: number; label: string }>(
  list: T[] | undefined,
): T[] | undefined {
  if (!list?.length) {
    return list;
  }
  return [...list].sort((a, b) => {
    if (a.price !== b.price) {
      return a.price - b.price;
    }
    const la = shortVariationLabel(a.label);
    const lb = shortVariationLabel(b.label);
    return la.localeCompare(lb, "ro", { numeric: true, sensitivity: "base" });
  });
}

/** Producteigenschappen uit `specsText` (`Naam: waarde`, één per regel). */

export type SpecEntry = {
  name: string;
  value: string;
};

const SKIP_SPEC_FACET_NAMES = new Set([
  "merk",
  "brand",
  "marca",
  "kleur",
  "color",
  "colour",
  "culoare",
  "culori",
  "maat",
  "size",
  "marime",
  "marimi",
  "pa_merk",
  "pa_brand",
  "pa_kleur",
  "pa_color",
  "pa_colour",
  "pa_size",
  "pa_maat",
]);

export function parseSpecEntries(text: string | undefined | null): SpecEntry[] {
  if (!text?.trim()) {
    return [];
  }
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const sep = line.indexOf(":");
      if (sep === -1) {
        return { name: line, value: "" };
      }
      return {
        name: line.slice(0, sep).trim(),
        value: line.slice(sep + 1).trim(),
      };
    })
    .filter((row) => row.name || row.value);
}

export function specEntriesToText(rows: SpecEntry[]): string {
  return rows
    .map((row) => {
      const name = row.name.trim();
      const value = row.value.trim();
      if (!name && !value) return "";
      if (!value) return name;
      if (!name) return value;
      return `${name}: ${value}`;
    })
    .filter(Boolean)
    .join("\n");
}

export function splitSpecValues(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function isSkippedSpecFacetName(name: string): boolean {
  return SKIP_SPEC_FACET_NAMES.has(name.trim().toLowerCase());
}

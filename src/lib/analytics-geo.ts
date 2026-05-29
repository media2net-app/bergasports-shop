/** Approximate country centroids [lat, lng] for globe markers when IP geo is missing. */
const COUNTRY_CENTER: Record<string, [number, number]> = {
  RO: [45.94, 24.97],
  MD: [47.41, 28.37],
  BG: [42.73, 25.49],
  HU: [47.16, 19.5],
  DE: [51.17, 10.45],
  AT: [47.52, 14.55],
  IT: [41.87, 12.57],
  FR: [46.23, 2.21],
  ES: [40.46, -3.75],
  PT: [39.4, -8.22],
  NL: [52.13, 5.29],
  BE: [50.5, 4.47],
  PL: [51.92, 19.15],
  CZ: [49.82, 15.47],
  SK: [48.67, 19.7],
  GR: [39.07, 21.82],
  TR: [38.96, 35.24],
  GB: [55.38, -3.44],
  IE: [53.41, -8.24],
  US: [39.83, -98.58],
  CA: [56.13, -106.35],
  AU: [-25.27, 133.78],
  IN: [20.59, 78.96],
  CN: [35.86, 104.2],
  JP: [36.2, 138.25],
  BR: [-14.24, -51.93],
  MX: [23.63, -102.55],
  AE: [23.42, 53.85],
  SA: [23.89, 45.08],
  CH: [46.82, 8.23],
  SE: [60.13, 18.64],
  NO: [60.47, 8.47],
  DK: [56.26, 9.5],
  FI: [61.92, 25.75],
  UA: [48.38, 31.17],
  RS: [44.02, 21.01],
  HR: [45.1, 15.2],
};

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Slight spread so multiple visitors in one country do not stack on one pixel. */
export function jitterCoords(lat: number, lng: number, seed: string): [number, number] {
  const h = hashSeed(seed);
  const a = ((h % 1000) / 1000 - 0.5) * 5;
  const b = (((h / 1000) % 1000) / 1000 - 0.5) * 5;
  return [lat + a, lng + b];
}

export function coordsFromCountry(countryCode: string | null | undefined): [number, number] | null {
  if (!countryCode) {
    return null;
  }
  return COUNTRY_CENTER[countryCode.trim().toUpperCase()] ?? null;
}

export function resolveVisitorCoords(input: {
  latitude: number | null;
  longitude: number | null;
  countryCode: string | null;
  sessionId: string;
}): [number, number] | null {
  if (
    input.latitude != null &&
    input.longitude != null &&
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude)
  ) {
    return jitterCoords(input.latitude, input.longitude, input.sessionId);
  }
  const country = coordsFromCountry(input.countryCode) ?? COUNTRY_CENTER.RO;
  return jitterCoords(country[0], country[1], input.sessionId);
}

export type RequestGeo = {
  countryCode: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
};

/** Default shop region when IP geo is unavailable (localhost, dev). */
export const ANALYTICS_GEO_FALLBACK: RequestGeo = {
  countryCode: "RO",
  city: "Romania",
  region: null,
  latitude: 44.4268,
  longitude: 26.1025,
};

export function geoFromRequestHeaders(headers: Headers): RequestGeo {
  const countryCode =
    headers.get("x-vercel-ip-country") ??
    headers.get("cf-ipcountry") ??
    headers.get("x-country-code");

  const city = headers.get("x-vercel-ip-city") ?? headers.get("cf-ipcity");
  const region = headers.get("x-vercel-ip-country-region") ?? headers.get("cf-region");

  const latRaw = headers.get("x-vercel-ip-latitude") ?? headers.get("cf-iplatitude");
  const lngRaw = headers.get("x-vercel-ip-longitude") ?? headers.get("cf-iplongitude");

  const latitude = latRaw != null && latRaw !== "" ? Number.parseFloat(latRaw) : null;
  const longitude = lngRaw != null && lngRaw !== "" ? Number.parseFloat(lngRaw) : null;

  const geo: RequestGeo = {
    countryCode: countryCode?.trim() || null,
    city: city?.trim() || null,
    region: region?.trim() || null,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
  };

  if (!geo.countryCode && geo.latitude == null) {
    return { ...ANALYTICS_GEO_FALLBACK };
  }

  return geo;
}

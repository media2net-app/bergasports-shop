import "server-only";

/** Magnific API (formerly Freepik API) — server-side only. */
export function getMagnificApiKey(): string | null {
  return (
    process.env.MAGNIFIC_API_KEY?.trim() ||
    process.env.FREEPIK_API_KEY?.trim() ||
    process.env.AI_IMAGE_MAGNIFIC_API_KEY?.trim() ||
    null
  );
}

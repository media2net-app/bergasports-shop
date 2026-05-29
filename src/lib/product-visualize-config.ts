/** Public copy for product in-room visualization (client-safe). */
export const PRODUCT_VISUALIZE_COPY = {
  button: "Bekijk in je ruimte",
  buttonShort: "AI · Preview",
  title: "Bekijk het product in je ruimte",
  subtitle:
    "Maak een foto van je ruimte — AI plaatst dit product in je foto, zodat je een indruk krijgt van het resultaat.",
  consent:
    "Ik ga akkoord dat mijn foto alleen voor deze preview door AI wordt verwerkt. We slaan de foto niet op.",
  privacyNote: "De foto wordt beveiligd naar OpenAI gestuurd en niet in onze database bewaard.",
  uploadLabel: "Foto van je ruimte",
  generate: "Preview genereren",
  loading: "AI plaatst het product in je ruimte…",
  loadingHint: "Dit kan 30–60 seconden duren.",
  resultTitle: "Zo zou het eruit kunnen zien",
  tryAgain: "Andere foto",
  close: "Sluiten",
} as const;

export function productVisualizeEnabled(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY?.trim() ||
      process.env.CHATGPT_API_KEY?.trim() ||
      process.env.AI_IMAGE_API_KEY?.trim(),
  );
}

/** All products support in-room preview when AI is configured. */
export function isProductVisualizeEligible(_category?: string, _name?: string): boolean {
  return true;
}

export function productVisualizeScene(
  category: string,
  name: string,
): "bedroom" | "bathroom" | "room" {
  const hay = `${category} ${name}`.toLowerCase();
  if (/fiets|bike|wheel|wiel|helm|shoe|schoen|bril|glass/i.test(hay)) return "room";
  return "room";
}

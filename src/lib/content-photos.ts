/** Eigen foto's van bergasports.com, lokaal in public/content/. */

export const CONTENT_PHOTOS = {
  storefront: {
    src: "/content/winkel-gevel.jpg",
    alt: "Cipollini racefiets voor de gevel van Bergasports aan de Julianastraat in Dedemsvaart",
  },
  ingmarPodium: {
    src: "/content/ingmar-podium.jpg",
    alt: "Ingmar Berga als kampioen op het podium tijdens zijn topsportcarrière",
  },
  ingmarNimbl: {
    src: "/content/ingmar-nimbl.jpg",
    alt: "Ingmar Berga in de winkel bij de Nimbl-wand met wielrenschoenen",
  },
  workshopIngmar: {
    src: "/content/werkplaats-ingmar.jpg",
    alt: "Ingmar Berga aan het werk aan een racefiets in de werkplaats van Bergasports",
  },
  workshopStand: {
    src: "/content/werkplaats-stand.jpg",
    alt: "Cipollini racefiets op de montagestandaard in de werkplaats van Bergasports",
  },
  showroom: {
    src: "/content/showroom-orbea.jpg",
    alt: "Orbea in de showroom van Bergasports in Dedemsvaart",
  },
} as const;

export type ContentPhotoKey = keyof typeof CONTENT_PHOTOS;

export function contentFigure(key: ContentPhotoKey, caption?: string): string {
  const photo = CONTENT_PHOTOS[key];
  const cap = caption ? `<figcaption>${caption}</figcaption>` : "";
  return `<figure><img src="${photo.src}" alt="${photo.alt}" width="1200" height="800" loading="lazy" />${cap}</figure>`;
}

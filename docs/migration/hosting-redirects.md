# Hosting-redirects naast de shop

De Next.js-app geeft **301** op padwijzigingen (Woo `/product-category/…`, WP-berichten op `/{slug}`, `/nl/…`, cart/account). Dat werkt zodra **dezelfde hostname** naar deze app wijst.

## Wat de shop zelf doet

- Statische regels: `docs/migration/redirect-map.json` + `src/proxy.ts`
- Groeiende mapping (product-/nieuwspermalinks): tabel `seo_redirects`, gevuld bij `npm run import:wordpress`
- Na import: `npm run export:seo-redirects` schrijft `docs/migration/redirect-map.generated.json` (ook ingeladen in `next.config` bij de volgende deploy → extra 301's op de CDN)
- WP-berichten stonden op `https://www.bergasports.com/{slug}/` → `301` naar `/nieuws/{slug}`
- Homepage `/?p=123` → het geïmporteerde nieuwsbericht
- Juridische URL’s (`/privacybeleid`, `/contact`, `/over-ons`, `/`) worden **niet** als bron overschreven

Export voor Nginx/Cloudflare/Vercel: `npm run export:seo-redirects` → `docs/migration/redirect-map.generated.json`

## Wat je nog op DNS/hosting moet zetten

Alleen nodig als de **hostname** verandert of www/apex nog naar WordPress wijst.

1. **Zelfde domein (bergasports.com blijft, WP eraf)**  
   DNS A/CNAME naar Vercel/deze app. Geen extra pad-redirects nodig; de shop vangt oude paden af.

2. **www → apex of omgekeerd**  
   Eén 301 op hostniveau, bijv. `www.bergasports.com` → `https://bergasports.com$request_uri` (of andersom). Kies één canonical host (staat in Search Console).

3. **Nieuw domein (bijv. bergasports.nl als NL, .com als EN)**  
   Op de **oude host** (of DNS-provider) een wildcard 301:
   - `https://www.bergasports.com/:path` → `https://www.bergasports.nl/:path`  
   Daarna doet de Next-app de pad-mapping (zoals `/product-category/bikes` → `/fietsen`).

4. **WordPress blijft tijdelijk op hetzelfde domein**  
   Dan komen 301’s in deze app niet aan. Zet WP in onderhoud of verwijs de host alvast naar Vercel.

Geen WXR/XML nodig voor redirects; de import schrijft de permalinks weg.

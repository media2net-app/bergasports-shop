# Bergasports 2.0 — migratiedocumenten

| Document | Doel |
|----------|------|
| [url-inventory.md](./url-inventory.md) | Inventaris oude WP-URL’s |
| [redirect-map.json](./redirect-map.json) | Statische 301-mapping (next.config) |
| [hosting-redirects.md](./hosting-redirects.md) | DNS/hosting naast in-app 301's |
| [content-decisions.md](./content-decisions.md) | Per pagina: behouden / herschrijven / … |
| [mollie-checklist.md](./mollie-checklist.md) | Betaalmethodes + Apple Pay |
| [sitemap-spec.md](./sitemap-spec.md) | Pagina-voor-pagina NL/EN spec |

Architectuur: één Vercel-app, Prisma = system of record, WC = catalog sync, Mollie direct.
Domeinen: `bergasports.nl` (NL) · `bergasports.com` (EN).

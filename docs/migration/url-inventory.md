# URL-inventaris (oude bergasports.com)

Bron: WooCommerce REST + WP REST (aug 2026).

## Categorieën (WC)

| WC slug | Count | Nieuwe NL | Nieuwe EN |
|---------|------:|-----------|-----------|
| bikes | 45 | /fietsen/ | /bikes/ |
| road-bike | 15 | /racefietsen/ | /road-bikes/ |
| gravelbike | 13 | /gravel/ | /gravel/ |
| gravel-bike | 0 | /gravel/ | /gravel/ |
| mtb | 7 | /mtb/ | /mtb/ |
| wheels | 11 | /wielen/ | /wheels/ |
| scope-outlet | 29 | /scope-outlet/ | /scope-outlet/ |
| cycling-shoes | 15 | /wielrenschoenen/ | /cycling-shoes/ |
| lafuga-wear | 12 | /lafuga/ | /lafuga/ |
| glasses | 9 | /brillen/ | /glasses/ |
| accessories | 18 | /accessoires/ | /accessories/ |
| cycling-helmets | 10 | /helmen/ | /cycling-helmets/ |
| cleats | 0 | /schoenplaatjes/ | /cleats/ |
| group-sets | 0 | /groepsets/ | /group-sets/ |
| speed-skates | 12 | /skeelers/ | /speed-skates/ |
| used-bikes | 0 | /tweedehands/ | /used-bikes/ |

Oude paden o.a. `/nl/product-categorie/{slug}/`, `/product-categorie/{slug}/`, legacy `/racingbikes`, `/cyclingshoes`, `/speedskates`, `/glasses`, `/scope-wheels`.

## CMS-pagina’s (selectie)

| Oude slug/path | Actie |
|----------------|-------|
| contact | → /contact |
| about-bergasports | → /over-ons · /about-us |
| bike-repair | → /onderhoud · /service |
| lafuga-kleding | → /lafuga |
| verzendkosten-en-levertijd | → /verzending · /shipping |
| retourneren-en-garantie | → /retouren · /returns |
| algemene-voorwaarden | behouden |
| privacy-policy | → /privacy |
| shop / cart / checkout / my-account | nieuwe commerce-routes |
| dealer/SEO landings (colnago-, orbea-, cervelo-, scope-…) | rewrite of merge naar merken/categorie |

## Nieuws (62 posts)

Alle WP posts → `/nieuws/[slug]` (NL) en `/news/[slug]` (EN). Slugs behouden waar mogelijk; emoji-slugs opschonen bij migratie.

# Supabase → Prisma migratie (Bergasports)

Volg de voortgang live:

```bash
tail -f logs/prisma-migration.log
```

Handmatig schema sync:

```bash
npm run migrate:prisma
```

---

## Fases & checklist

### Fase 0 — Voorbereiding
- [x] Prisma Postgres verbonden (`DATABASE_URL`)
- [x] `admin_users` + super-admin `chiel@media2net.nl`
- [x] Migratielog (`logs/prisma-migration.log`)

### Fase 1 — Database schema
- [x] Volledig Prisma-schema (alle tabellen uit Supabase-migrations)
- [x] `prisma db push` op Prisma DB
- [x] `prisma generate`

### Fase 2 — Core data-laag
- [x] `src/lib/prisma.ts` + `src/lib/database.ts`
- [x] `products-db.ts` → Prisma
- [x] `categories-db.ts` → Prisma
- [x] `orders-db.ts` → Prisma
- [x] `site-pages-db.ts` → Prisma

### Fase 3 — Shop & admin ondersteuning
- [x] `analytics-db.ts`, `analytics-live.ts`
- [x] `dashboard-stats.ts`, `marketing-*`, `pagespeed-db`
- [x] `ai-*-db.ts`, `product-image-storage` (lokaal `/product-images/`)
- [x] `easy-sales-sync.ts`, `one-million-plan-status.ts`

### Fase 4 — Opschonen
- [x] Verwijderd `@supabase/*`, `src/utils/supabase/*`, `supabase-admin.ts`
- [x] Admin/settings-teksten → `DATABASE_URL`
- [x] `next.config.mjs` image patterns (geen supabase.co)
- [x] `proxy.ts` zonder Supabase sessie
- [x] Production build geslaagd

---

## Tabellen (Prisma)

| Tabel | Status |
|-------|--------|
| admin_users | ✅ |
| products | ✅ |
| categories | ✅ |
| catalog_meta | ✅ |
| orders / order_items | ✅ |
| site_pages | ✅ |
| analytics_sessions / analytics_page_views | ✅ |
| product_image_assets | ✅ |
| marketing_email_log | ✅ |
| marketing_cron_runs | ✅ |
| marketing_channel_insights | ✅ |
| pagespeed_reports | ✅ |
| ai_generated_images | ✅ |
| ai_image_category_templates | ✅ |

---

## Afbeeldingen

- Product mirrors: `public/product-images/` → URL `{SITE}/product-images/...`
- AI images: `public/admin/ai-generated/`

---

## Nog optioneel (jij / later)

- [ ] Oude Supabase-vars uit `.env.local` verwijderen (niet meer gebruikt)
- [ ] `scripts/*.mjs` bulk-import scripts naar Prisma omzetten
- [ ] `npm run seed:site-pages` naar Prisma seed
- [ ] Product/categorie-data importeren in schone DB

# Bergasports — webshop

Next.js webshop gebaseerd op de [Bergasports](https://github.com/) stack (shop, admin, Prisma Postgres, orderflow, marketing).

## Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Backend:** App Router API routes, Prisma + PostgreSQL
- **Admin:** `/admin` — producten, categorieën, orders, marketing, AI-afbeeldingen

## Lokaal starten

```bash
cp .env.local.example .env.local
# Vul DATABASE_URL en ADMIN_JWT_SECRET in

npm install
npm run migrate:prisma
node scripts/create-admin-user.mjs jouw@email.nl jouw_wachtwoord --super-admin
npm run seed:site-pages

npm run dev
```

Open [http://localhost:3060](http://localhost:3060) (shop) en [http://localhost:3060/admin](http://localhost:3060/admin).

## Omgeving

| Variabele | Doel |
|-----------|------|
| `DATABASE_URL` | Prisma Postgres |
| `ADMIN_JWT_SECRET` | Admin-sessie (min. 16 tekens) |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL (bijv. `https://www.bergasports.com`) |
| `SMTP_*` / `RESEND_API_KEY` | Orderbevestigingen |
| `EASY_SALES_*` | Optioneel: order sync |

Zie `.env.local.example` voor het volledige overzicht.

## Volgende stappen

1. Eigen Postgres-database aanmaken (niet de Bergasports-database hergebruiken).
2. Categorieën en producten importeren of handmatig in admin aanmaken.
3. Logo/favicon in `public/brand/` verfijnen.
4. Optioneel: Roemeense URL-slugs (`/despre-noi`, `/categorii`) hernoemen naar NL-paden.

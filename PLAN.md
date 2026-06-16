# Plan: Integracja z Agency-Platform + Usunięcie DatoCMS

## Na czym polega zadanie?

Aplikacja `chicken-of-the-city` to szablon sklepu internetowego (aktualnie: restauracja z dostawą). Każdy nowy klient (restauracja/biznes) wymaga dziś: nowego repo, nowego konta DatoCMS, nowego konta Supabase, ręcznej konfiguracji.

**Cel:** Przerobić aplikację tak, żeby:
1. Mogła być zarządzana przez **[agency-platform](../../agency-platform/)** — panel, który automatyzuje onboarding nowych klientów (domena, baza danych, dane startowe).
2. Wszystkie dane konfiguracyjne i produkty były przechowywane **w samej aplikacji** (Neon + Drizzle ORM + Vercel Blob na obrazki) — zamiast DatoCMS.
3. Jedna instancja aplikacji obsługiwała **wielu klientów** (multi-tenancy przez subdomenę), izolowanych przez `client_slug` i Row-Level Security.

**Agency-platform** to wewnętrzny panel B2B przy `C:\Users\Jerzy\Desktop\agency-platform\`. Zarządza produktami (aplikacjami SaaS) i tenantami (klientami). Przy dodaniu nowego tenanta:
- konfiguruje domenę przez Vercel API,
- wywołuje `POST /api/setup` na aplikacji produktu,
- aplikacja tworzy rekord klienta + pierwsze dane startowe.

---

## Aktualny stan (co i gdzie jest)

### DatoCMS (do usunięcia)
Przechowuje teraz wszystkie dane konfiguracyjne i produktowe:
- **Products** — nazwa, opis, cena, alergeny, zdjęcie, kategoria
- **Categories** — nazwa, kolejność
- **RestaurantInfo** — telefon, adres, email, godziny, minimalna kwota zamówienia
- **SeoSettings** — meta title, meta description, favicon
- **BrandSettings** — nazwa restauracji, tagline, teksty hero, kolory brand (hex)
- **EmailSettings** — szablony emaili do właściciela i klienta

### Supabase (do zastąpienia przez Neon)
Przechowuje dane transakcyjne:
- **orders** — zamówienia (dane klienta, kwota, adres, status)
- **order_items** — pozycje zamówień
- **products** — kopia produktów z DatoCMS (sync przez webhook)

### Stripe
Zostaje bez zmian — każdy klient ma swoje konto Stripe (env var per tenant lub per instancja).

### Resend
Zostaje bez zmian — szablony emaili przeniosą się do DB zamiast DatoCMS.

---

## Architektura docelowa

```
agency-platform (panel wewnętrzny)
    → rejestruje "chicken-of-the-city" jako produkt
    → dodaje tenanta (restauracja X): slug, email, hasło admina
    → wywołuje POST chicken-of-the-city.pl/api/setup
    → aplikacja tworzy klienta w Neon

chicken-of-the-city (ta aplikacja)
    ├── Neon (Postgres) + Drizzle ORM
    │   ├── clients          ← lista restauracji (tenantów)
    │   ├── client_auth      ← hasła adminów (bcrypt)
    │   ├── products         ← produkty per restauracja
    │   ├── categories       ← kategorie per restauracja
    │   ├── orders           ← zamówienia per restauracja
    │   ├── order_items      ← pozycje zamówień
    │   └── settings         ← konfiguracja (brand, seo, email, info) per restauracja
    ├── Vercel Blob          ← obrazki produktów i favicon
    ├── Stripe               ← płatności (klucze per tenant w settings)
    └── Resend               ← emaile (klucze i szablony per tenant w settings)

Middleware:
    hostname → GET agency-platform/api/tenant → { slug, status }
    → ustawia app.current_tenant w Postgres (RLS)
```

---

## Schemat bazy danych (Drizzle)

```ts
// Klienci (tenanci) — jeden rekord = jedna restauracja
clients {
  id: uuid PK
  slug: text UNIQUE          // "restauracja-anna"
  business_name: text
  email: text
  status: "active" | "suspended"
  created_at: timestamp
}

// Auth adminów restauracji
client_auth {
  id: uuid PK
  client_slug: text FK → clients.slug
  password_hash: text        // bcrypt
}

// Konfiguracja per restauracja (zastępuje DatoCMS: wszystkie singletony)
settings {
  id: uuid PK
  client_slug: text FK
  // RestaurantInfo
  phone: text
  address: text
  email_contact: text
  opening_hours: text
  minimum_order_amount: numeric
  // BrandSettings
  restaurant_name: text
  tagline: text
  hero_label: text
  hero_title: text
  hero_highlight: text
  hero_subtitle: text
  category_emoji: text
  brand_color: text          // "#FF6B35"
  secondary_color: text
  // SeoSettings
  meta_title: text
  meta_description: text
  favicon_url: text          // Vercel Blob URL
  // EmailSettings
  owner_email_subject: text
  owner_email_body: text
  customer_email_subject: text
  customer_email_body: text
  // Stripe + Resend (per klient)
  stripe_publishable_key: text
  stripe_secret_key: text    // szyfrowane lub env per tenant
  stripe_webhook_secret: text
  resend_api_key: text
  resend_from: text
}

// Kategorie produktów
categories {
  id: uuid PK
  client_slug: text FK
  name: text
  order: integer
}

// Produkty (zastępuje DatoCMS Products + Supabase products)
products {
  id: uuid PK
  client_slug: text FK
  name: text
  description: text nullable
  price: numeric
  allergens: text nullable
  image_url: text nullable   // Vercel Blob URL
  category_id: uuid FK → categories.id
  active: boolean DEFAULT true
  created_at: timestamp
  updated_at: timestamp
}

// Zamówienia (przeniesione z Supabase)
orders {
  id: uuid PK
  client_slug: text FK
  order_number: text UNIQUE
  stripe_session_id: text
  customer_name: text
  customer_email: text
  amount_total: numeric
  shipping_address: text
  notes: text nullable
  status: text DEFAULT "completed"
  created_at: timestamp
}

// Pozycje zamówień (przeniesione z Supabase)
order_items {
  id: uuid PK
  order_id: uuid FK → orders.id
  product_name: text
  quantity: integer
  unit_price: numeric
}
```

---

## Kroki implementacji

### Etap 0: Przygotowanie infrastruktury
- [ ] 0.1 Dodać Neon do projektu przez Vercel Marketplace (lub połączyć istniejącą bazę)
- [ ] 0.2 Zainstalować zależności: `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`, `jose`, `bcryptjs`, `@types/bcryptjs`
- [ ] 0.3 Usunąć zależności: `@supabase/supabase-js` (Supabase zostaje dopóki nie zmigrowani)
- [ ] 0.4 Skonfigurować `drizzle.config.ts`

### Etap 1: Schema bazy danych
- [ ] 1.1 Stworzyć `src/lib/db/schema.ts` — wszystkie tabele jak powyżej
- [ ] 1.2 Stworzyć `src/lib/db/index.ts` — klient Neon + Drizzle
- [ ] 1.3 Uruchomić `drizzle-kit push` — zastosować schemat

### Etap 2: Auth per-tenant (zastąpienie ADMIN_PASSWORD)
- [ ] 2.1 Stworzyć `src/lib/auth.ts` — tworzenie i weryfikacja JWT (jose), bcrypt
- [ ] 2.2 Zaktualizować `src/app/api/admin/login/route.ts` — sprawdzanie bcrypt zamiast env var
- [ ] 2.3 Zaktualizować `src/middleware.ts` — weryfikacja JWT zamiast cookie z hasłem; wyciąganie `clientSlug` z tokena i przekazywanie w nagłówku

### Etap 3: Integracja z agency-platform
- [ ] 3.1 Stworzyć `src/app/api/setup/route.ts` — endpoint dla agency-platform:
  - weryfikuje `x-agency-secret` header
  - tworzy rekord w `clients`
  - hashuje i zapisuje hasło admina w `client_auth`
  - tworzy domyślny rekord w `settings` (puste pola do uzupełnienia)
- [x] 3.2 Zaktualizować middleware — lookup tenanta z agency-platform przez hostname, ustawienie kontekstu

### Etap 4: Migracja danych produktowych (usunięcie DatoCMS)
- [ ] 4.1 Zastąpić `src/lib/datocms.ts` przez `src/lib/queries.ts` — funkcje pobierające dane z Neon
  - `getAllCategories(clientSlug)`
  - `getAllProducts(clientSlug)`
  - `getProductsByCategory(clientSlug, categoryId)`
  - `getRestaurantInfo(clientSlug)`
  - `getSeoSettings(clientSlug)`
  - `getBrandSettings(clientSlug)`
  - `getEmailSettings(clientSlug)`
- [ ] 4.2 Zaktualizować `next.config.ts` — dodać Vercel Blob domain, usunąć datocms-assets.com
- [ ] 4.3 Zaktualizować wszystkie strony i komponenty używające `datocms.ts`

### Etap 5: Upload obrazków (Vercel Blob zamiast DatoCMS)
- [ ] 5.1 Zainstalować `@vercel/blob`
- [ ] 5.2 Stworzyć `src/app/api/upload/route.ts` — endpoint do uploadu zdjęć, zwraca Blob URL
- [ ] 5.3 Zaktualizować panel admina — formularz produktu z file inputem zamiast DatoCMS UI

### Etap 6: Panel admina — CRUD dla danych (zastąpienie DatoCMS UI)
- [ ] 6.1 `/admin/dashboard/produkty` — lista produktów, dodawanie, edycja, usuwanie, upload zdjęcia
- [ ] 6.2 `/admin/dashboard/kategorie` — CRUD kategorii z drag-and-drop kolejności
- [ ] 6.3 `/admin/dashboard/ustawienia` — formularz edycji wszystkich pól z `settings` (brand, seo, info, email templates, Stripe/Resend keys)
- [ ] 6.4 Podgląd favicon z upload

### Etap 7: Migracja zamówień (Supabase → Neon)
- [ ] 7.1 Zaktualizować `src/lib/supabase.ts` → usunąć, zastąpić Drizzle queries
- [ ] 7.2 Zaktualizować `src/app/api/webhook/route.ts` — zapis zamówień do Neon zamiast Supabase
- [ ] 7.3 Zaktualizować wszystkie zapytania w `/admin/dashboard` — z Supabase SDK na Drizzle
- [ ] 7.4 Usunąć `src/app/api/datocms-webhook/route.ts` (sync DatoCMS → Supabase odpada)

### Etap 8: Stripe — klucze per tenant
- [ ] 8.1 Zaktualizować `src/app/api/checkout/route.ts` — pobierać klucze Stripe z `settings` dla danego `clientSlug`
- [ ] 8.2 Zaktualizować `src/app/api/webhook/route.ts` — weryfikować webhook secret per tenant
- [ ] 8.3 Zaktualizować `src/app/layout.tsx` — `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` musi być dynamiczny per tenant (przekazywany jako prop lub przez osobny endpoint)

### Etap 9: Resend — per tenant
- [ ] 9.1 Zaktualizować wysyłkę emaili — pobierać `resend_api_key`, `resend_from` i szablony z `settings`

### Etap 10: Rejestracja w agency-platform
- [ ] 10.1 Zarejestrować aplikację jako produkt w agency-platform (panel UI)
- [ ] 10.2 Ustawić env var `AGENCY_API_URL` i `AGENCY_API_SECRET`
- [ ] 10.3 Przetestować onboarding pierwszego tenanta end-to-end

### Etap 11: Cleanup
- [ ] 11.1 Usunąć `DATOCMS_API_TOKEN`, `DATOCMS_FULL_ACCESS_API_TOKEN`, `DATOCMS_WEBHOOK_SECRET` z env
- [ ] 11.2 Usunąć `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` z env
- [ ] 11.3 Usunąć `ADMIN_PASSWORD` z env
- [ ] 11.4 Zaktualizować README i `.env.example`
- [ ] 11.5 Usunąć `@datocms/cma-client-node` z package.json

---

## Nowe zmienne środowiskowe

```env
# Neon (Postgres)
DATABASE_URL                     # Connection string z Vercel Marketplace

# Agency-Platform
AGENCY_API_URL                   # URL agency-platform (np. https://agency.riskydev.com)
AGENCY_API_SECRET                # Shared secret do weryfikacji requestów

# JWT
JWT_SECRET                       # Losowy 256-bit secret do podpisywania tokenów adminów

# Vercel Blob
BLOB_READ_WRITE_TOKEN            # Auto-dostarczany przez Vercel Marketplace

# Stripe i Resend → przenoszą się do tabeli `settings` (per tenant)
# Zostają jako env fallback dla developmentu:
STRIPE_SECRET_KEY                # (dev fallback)
RESEND_API_KEY                   # (dev fallback)
```

---

## Kolejność prac (priorytet)

1. **Etap 0–1** — baza danych (fundament wszystkiego)
2. **Etap 4** — migracja z DatoCMS (odblokowuje usunięcie zewnętrznej zależności)
3. **Etap 5–6** — panel admina z CRUD + upload (zastępuje DatoCMS UI)
4. **Etap 2–3** — auth i agency-platform (multi-tenancy)
5. **Etap 7–9** — migracja Supabase, Stripe per-tenant, Resend per-tenant
6. **Etap 10–11** — integracja i cleanup

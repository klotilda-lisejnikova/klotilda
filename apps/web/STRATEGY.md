# Klotilda — Implementační strategie

Prezentační web a e-shop umělce na doméně **klotilda.cz**.

---

## Přehled projektu

|            |                                             |
| ---------- | ------------------------------------------- |
| **Doména** | klotilda.cz (již registrována)              |
| **Účel**   | Prezentace umělce + prodej originálních děl |
| **Deploy** | Railway.com                                 |
| **DB**     | PostgreSQL (Railway managed)                |
| **Jazyky** | CZ / EN                                     |

### Tři repozitáře

| Repo                | Popis                                | Deploy                    |
| ------------------- | ------------------------------------ | ------------------------- |
| `klotilda-frontend` | Zákaznický web (prezentace + e-shop) | Railway — Next.js service |
| `klotilda-api`      | Backend API (be-core based)          | Railway — Node.js service |
| `klotilda-admin`    | Admin panel (správa e-shopu)         | Railway — Next.js service |

---

## Tech Stack

### Frontend (`klotilda-frontend`, `klotilda-admin`)

- **Next.js 15** — App Router, SSR/SSG, SEO optimalizace
- **TypeScript**
- **Tailwind CSS** — styling
- **next-intl** — CZ/EN i18n (App Router kompatibilní)
- **Zustand** — state management pro košík (persistovaný v localStorage)
- **@eleansphere/service-core** — typed service vrstva pro volání API

### Backend (`klotilda-api`)

- **Node.js 22+** + **Express.js**
- **@eleansphere/be-core v1.7.0** — CRUD, file upload, auth (JWT + bcrypt)
- **Sequelize 6** + **PostgreSQL** — ORM + databáze
- **Comgate** — platební brána (karta + QR kód)
- **Nodemailer** (přes be-core `createEmailService`) — potvrzovací emaily přes SMTP účet klotilda.cz

### Infrastruktura

- **Railway.com** — hosting (frontend, backend, PostgreSQL)
- **GitHub Actions** — CI (build check, testy)
- **klotilda.cz** → Railway CNAME (SSL automaticky)

---

## Datové modely

### Product

```
id              string   (prefix: "prod", auto-generováno)
name_cs         string   (povinné)
name_en         string
description_cs  text
description_en  text
price           float    (povinné, min: 0)
category        string   (keramika | textil | vysivky)
stockCount      integer  (default: 1 — originály jsou po 1 kuse)
active          boolean  (default: true)
image1          blob     (hlavní foto — be-core file upload)
image2          blob     (volitelné)
image3          blob     (volitelné)
```

> **Poznámka k obrázkům**: be-core ukládá soubory jako BLOB do DB, 1 soubor na pole.
> Endpointy: `POST /api/products/:id/image1`, `GET /api/products/:id/image1` atd.

### Order

```
id                    string  (prefix: "ord", auto-generováno)
customerFirstName     string  (povinné)
customerLastName      string  (povinné)
customerEmail         string  (povinné, formát email)
customerPhone         string
street                string  (povinné)
city                  string  (povinné)
zip                   string  (povinné)
shippingMethod        string  (zasilkovna | ceska_posta | osobni_odber)
shippingPrice         float
items                 text    (JSON: [{productId, name, price, quantity}])
totalAmount           float   (povinné)
paymentMethod         string  (card | qr)
paymentStatus         string  (pending | paid | failed | refunded)
orderStatus           string  (new | processing | shipped | delivered | cancelled)
comgateTransactionId  string
notes                 text
```

### AdminUser (pro klotilda-admin přihlášení)

```
id        string  (prefix: "adm")
email     string  (povinné, unique, formát email)
password  string  (povinné, bcrypt hash — be-core auth)
```

---

## API endpointy (klotilda-api)

Be-core automaticky generuje CRUD. Custom logika přes plugin.

### Produkty (be-core CRUD)

```
GET    /api/products           seznam s paginací (?page=1&limit=20&category=keramika)
GET    /api/products/:id       detail produktu
POST   /api/products           vytvoření (chráněno JWT)
PUT    /api/products/:id       úprava (chráněno JWT)
DELETE /api/products/:id       smazání (chráněno JWT)
POST   /api/products/:id/image1   upload hlavního obrázku (chráněno JWT)
GET    /api/products/:id/image1   stažení obrázku (veřejné)
```

### Objednávky (custom plugin — kvůli platební logice)

```
POST   /api/orders             vytvoření objednávky → vrátí Comgate redirect URL
GET    /api/orders             seznam objednávek (chráněno JWT)
GET    /api/orders/:id         detail objednávky (chráněno JWT)
PUT    /api/orders/:id/status  změna stavu objednávky (chráněno JWT)
POST   /api/comgate/webhook    Comgate notifikace o platbě (veřejné, ověřeno podpisem)
```

### Auth (be-core built-in)

```
POST   /api/auth/login         přihlášení admina → { token, email }
```

---

## Fáze implementace

### FÁZE 1 — Setup & Infrastruktura

**Cíl**: Funkční Next.js projekt s deployment pipeline.

- [x] Inicializace Next.js 15 (`create-next-app` — App Router, TypeScript, Tailwind, ESLint)
- [x] Nastavení next-intl (CZ/EN, routing `/` pro CS, `/en/...` pro EN)
- [x] Základní layout komponenty: `<Header>`, `<Footer>`, `<Navigation>`
- [x] Konfigurace Prettier
- [x] GitHub Actions CI: build check na každý push
- [x] Railway projekt — napojení GitHub repo, automatický deploy z `main`
- [x] Konfigurace domény klotilda.cz (DNS CNAME → Railway)

**Výstup**: Web dostupný na klotilda.cz (i když jen s prázdnou stránkou).

---

### FÁZE 2 — Prezentační část (landing page)

**Cíl**: Vizitka umělce — statický obsah, bez API.

Sekce na landing page (`/` nebo `/[locale]/`):

- **Hero** — velká fotka, jméno umělce, tagline
- **O umělci** — bio, styl, inspirace (text + fotky)
- **Portfolio / galerie** — grid prací (hardcoded nebo z API ve fázi 4)
- **E-shop CTA** — odkaz na `/shop`
- **Kontakt** — email, social media, případně formulář

Technické úkoly:

- [x] Responzivní design (mobile-first, breakpointy: sm/md/lg)
- [x] CZ/EN překlady všech textů (next-intl translation files)
- [ ] SEO metadata (title, description, og:image pro každou stránku)
- [ ] Optimalizace obrázků (Next.js `<Image>`)
- [x] Přepínač jazyka v navigaci

**Výstup**: Kompletní landing page v CZ i EN.

---

### FÁZE 3 — Backend API (`klotilda-api`, nový repo)

**Cíl**: Funkční API pro produkty a objednávky.

- [x] Nový Node.js/TypeScript projekt, instalace `@eleansphere/be-core`
- [x] Konfigurace `.npmrc` pro GitHub Packages (`@eleansphere:registry`)
- [x] `src/index.ts` — `createApp()` s modely Product + AdminUser
- [x] Plugin pro Orders:
  - Validace položek + kontrola dostupnosti skladu
  - Vytvoření záznamu v DB
  - Volání Comgate API → získání platební URL
  - Vrácení redirect URL frontendu
- [x] Comgate webhook handler:
  - Ověření merchant ID + shared secret
  - Aktualizace `paymentStatus` na objednávce
  - Snížení `stockCount` u zakoupených produktů
  - Odeslání potvrzovacího emailu zákazníkovi (Resend)
  - Odeslání interní notifikace (admin email)
- [x] ENV proměnné: `DATABASE_URL`, `JWT_SECRET`, `COMGATE_MERCHANT_ID`, `COMGATE_SECRET`, `SMTP_HOST/PORT/USER/PASS`, `FROM_EMAIL`, `ADMIN_EMAIL`
- [x] Deploy na Railway (Node.js service + PostgreSQL addon)
- [ ] Sandbox testování Comgate

**Výstup**: API dostupné na `api.klotilda.cz` nebo jako Railway internal service.

---

### FÁZE 4 — E-shop frontend

**Cíl**: Funkční zákaznický e-shop napojený na API.

#### Service vrstva

- [ ] Instalace `@eleansphere/service-core`
- [ ] `ProductService` (extends `AbstractFileService`)
- [ ] `OrderService` (extends `AbstractCrudService`)
- [ ] `ServiceContainer` — singleton, `baseUrl` z ENV

#### Stránky e-shopu

- [ ] `/shop` — výpis produktů
  - Tabs/filtry: Vše / Keramika / Textil / Výšivky
  - Grid karet: foto, název, cena, stav (skladem / vyprodáno)
  - Lazy loading / paginace
- [ ] `/shop/[id]` — detail produktu
  - Fotogalerie (image1/2/3)
  - Název + popis (CZ/EN)
  - Cena, dostupnost
  - Tlačítko "Přidat do košíku" (disabled pokud vyprodáno)

#### Košík (Zustand)

- [ ] Store: `{ items: CartItem[], addItem, removeItem, clearCart }`
- [ ] Perzistence v `localStorage`
- [ ] Sidebar nebo stránka `/cart` — seznam, quantities, celková cena
- [ ] Badge s počtem položek v navigaci

#### Checkout (multi-step, `/checkout`)

- [ ] Krok 1 — Kontaktní údaje (jméno, příjmení, email, telefon, adresa)
- [ ] Krok 2 — Doprava (Zásilkovna / Česká pošta / Osobní odběr v Praze)
- [ ] Krok 3 — Platba (Karta / QR kód — oboje přes Comgate)
- [ ] Krok 4 — Shrnutí + potvrzení → `POST /api/orders` → redirect na Comgate
- [ ] `/checkout/success` — stránka po úspěšné platbě
- [ ] `/checkout/cancel` — stránka při zrušení/selhání platby

**Výstup**: Kompletní e-shop — zákazník může nakoupit bez registrace.

---

### FÁZE 5 — Admin panel (`klotilda-admin`, nový repo)

**Cíl**: Správa e-shopu pro interní použití.

- [ ] Inicializace projektu (Next.js nebo Vite/React — rozhodnutí při zahájení fáze)
- [ ] Přihlašovací stránka — `POST /api/auth/login` → uložení JWT tokenu
- [ ] Protected routes (redirect na login bez tokenu)

#### Správa produktů

- [ ] Seznam produktů (tabulka: název, kategorie, cena, sklad, aktivní)
- [ ] Formulář pro vytvoření/úpravu produktu
  - Název CZ/EN, popis CZ/EN, cena, kategorie, sklad
  - Upload obrázků (drag & drop nebo file input, max 3 fotky)
- [ ] Aktivace/deaktivace produktu (bez smazání)
- [ ] Smazání produktu

#### Správa objednávek

- [ ] Seznam objednávek (filtrování: stav platby, stav objednávky, datum)
- [ ] Detail objednávky (zákazník, položky, doprava, platba)
- [ ] Změna stavu objednávky (přijato → zpracovávám → odesláno → doručeno)
- [ ] Kontakt na zákazníka (email link)

**Výstup**: Admin dostupný na `admin.klotilda.cz`.

---

### FÁZE 6 — Produkční nasazení

**Cíl**: Vše běží v produkci na klotilda.cz.

- [ ] DNS konfigurace: `klotilda.cz` → frontend, `api.klotilda.cz` → backend, `admin.klotilda.cz` → admin
- [ ] Produkční ENV proměnné na Railway (všechny tři services)
- [ ] Comgate přepnutí na produkční merchant ID
- [ ] End-to-end test celého objednávkového flow
- [ ] Lighthouse audit (performance, SEO, accessibility)
- [ ] Základní monitoring na Railway (logy, alerts)
- [ ] Sitemap.xml pro SEO

---

## Otevřené otázky (rozhodnutí pro pozdější fáze)

| Otázka                    | Výchozí předpoklad                                        | Fáze |
| ------------------------- | --------------------------------------------------------- | ---- |
| Počet obrázků na produkt  | 3 (image1, image2, image3 jako samostatné BLOB sloupce)   | 3    |
| Zásilkovna integrace      | Pevné typy dopravy bez widget API (jednodušší)            | 4    |
| Email provider            | Resend (jednoduchá integrace, free tier)                  | 3    |
| Staging prostředí         | Jeden environment (dev local + prod Railway)              | 1    |
| Portfolio na landing page | Hardcoded v první fázi, napojit na API produkty volitelně | 2    |
| Kategorie produktů        | Keramika / Textil / Výšivky (lze rozšířit v adminu)       | 3    |

---

## ENV proměnné (přehled)

### klotilda-api

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
BANK_ACCOUNT_IBAN=CZ...          # QR platba (SPD) se generuje z tohohle
BANK_ACCOUNT_BIC=...             # volitelné, přidá se do ACC pole QR kódu
BANK_ACCOUNT_DISPLAY=123456789/0800  # volitelné, jinak se v UI/emailu zobrazí rovnou IBAN
SMTP_HOST=mail.klotilda.cz
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=info@klotilda.cz
SMTP_PASS=...
FROM_EMAIL=info@klotilda.cz
ADMIN_EMAIL=...       # váš Gmail — emailový server klotilda.cz přeposílá sem
FRONTEND_URL=https://klotilda.cz
NODE_AUTH_TOKEN=...   # GitHub Packages pro @eleansphere a @klotilda-lisejnikova
PORT=3001
```

> Platba přes Comgate byla odstraněna (2026-08-23) — objednávky se teď platí přímo bankovním
> převodem přes QR Platba kód (SPD formát), bez platební brány. Žádný webhook, žádné
> `COMGATE_*` proměnné. Sklad se snižuje hned při vytvoření objednávky; `paymentStatus` se
> nastavuje ručně v adminu (`PUT /api/orders/:id/status`) podle toho, co dorazí na účet
> (spárováno přes variabilní symbol).

### klotilda-frontend

```env
NEXT_PUBLIC_API_URL=https://api.klotilda.cz
```

### klotilda-admin

```env
NEXT_PUBLIC_API_URL=https://api.klotilda.cz
```

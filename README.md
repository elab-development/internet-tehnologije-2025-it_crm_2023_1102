# IT CRM — opis aplikacije i tehnologije.

IT CRM je full-stack veb aplikacija za upravljanje prodajnim procesom i odnosima sa klijentima. Sistem je organizovan po ulogama (role-based UI i API dozvole) i omogućava rad nad klijentima, kontaktima, prodajnim prilikama (opportunities), aktivnostima, kao i pregled timskih metrika.

![IT CRM Logo](./it_crm/app/favicon.ico)

> Struktura repozitorijuma (jedan Next.js projekat).
> - `app/` — Next.js App Router (stranice + API rute).
> - `src/` — klijentski i serverski kod (servisi, validatori, tipovi, UI komponente).
> - `prisma/` — Prisma šema, migracije i seed.
> - `public/` — statički fajlovi (npr. Swagger UI, slike, favicon).

---

## Ciljna grupa i uloge korisnika.

Aplikacija podržava sledeće uloge:

- **Administrator (admin)**: administracija sistema i uvid u metrike na nivou celog sistema/tima.
- **Sales manager (sales_manager)**: upravlja klijentima, kontaktima, opportunity-jima i timskim aktivnostima.
- **Freelancer (freelancer)**: radi na dodeljenim klijentima/opportunity-jima i beleži aktivnosti (note/call/meeting) u okviru svog scope-a.

---

## Ključne funkcionalnosti.

### CRM podaci.
- **Client categories**: kategorizacija klijenata (npr. segmenti, industrije).
- **Client companies**: evidencija kompanija, status (lead/active/inactive/paused), dodela freelancera iz tima.
- **Contacts**: kontakti vezani za klijente (osoba, email/telefon, pozicija, itd.).
- **Opportunities**: prodajne prilike sa fazama (stage), statusom, procenjenom vrednošću, valutom, verovatnoćom i očekivanim datumom zatvaranja.

### Aktivnosti (Activities).
- Evidencija aktivnosti: **beleške**, **pozivi**, **sastanci**.
- Aktivnosti mogu biti vezane za:
  - **Client company**.
  - **Opportunity**.
- Pregled aktivnosti po entitetu i/ili filtru.

### Metrike (Metrics).
- Pregled metrika po periodu (npr. broj prilika po fazama, dobijeni poslovi, ukupna vrednost, trendovi).
- Prikaz kroz grafikone (Google Charts) na odgovarajućim stranicama za role.

### Industry competitors.
- Stranica koja prikazuje vrednosti deonica najvećih IT kompanija (Alpha Vantage API).
- Slider IT slika (Pexels API).
- API ključevi se čuvaju u `.env`.

---

## Tehnologije koje se koriste.

### Frontend + Backend.
- **Next.js (App Router)** — full-stack pristup (UI + API rute u istom projektu).
- **React** — klijentske stranice (Client Components) za interaktivne ekrane.
- **TypeScript** — tipovi za UI i API komunikaciju.

### Baza podataka.
- **PostgreSQL** — relacijska baza.
- **Prisma ORM** — šema, migracije, seed, Prisma Client.

### Autentifikacija i autorizacija.
- Token-based autentifikacija (u okviru API ruta) i role-based autorizacija.
- Scope pristup podacima (admin vidi sve; ostali vide svoje/timske podatke prema pravilima).

### Dodatne integracije.
- **Swagger UI + OpenAPI** — dokumentacija API-ja (statički fajlovi u `public/swagger/`).
- **Google Charts** — prikaz metrika kroz grafikone.
- **Pexels API** — slike za slider.
- **Alpha Vantage API** — tržišni podaci (akcije).

---

## Podešavanje okruženja (.env).

U root-u projekta se nalazi `.env` (ne commit-uje se). Primer promenljivih koje se tipično koriste:

- `DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public`.
- `PEXELS_API_KEY=...`.
- `ALPHA_VANTAGE_API_KEY=...`.

> Ako koristiš Prisma config (`prisma.config.ts`), moguće je da Prisma preskoči automatsko učitavanje env varijabli i oslanja se na taj config. Proveri poruku u terminalu da li piše “Prisma config detected, skipping environment variable loading.”.

---

## Pokretanje projekta (lokalno, bez Docker-a).

> Pretpostavke: Node.js 18+.

### 1) Instalacija zavisnosti.
- `npm install`.

### 2) Pokretanje Prisma Dev servera (poseban terminal).
U jednom terminalu pokreni Prisma Dev server:

- `npx prisma dev`.

Ovaj server tipično podigne PostgreSQL i otvori portove (npr. 51213–51215). U izlazu terminala vidiš gde je baza dostupna (host/port).

> Bitno: Prisma Dev server treba da ostane upaljen dok radiš lokalno, zato je najbolje da ide u poseban terminal.

### 3) Reset baze (migracije + seed).
U drugom terminalu (dok Prisma Dev server radi):

- `npx prisma migrate reset`.

Ovo radi:
- primenu svih migracija.
- generisanje Prisma Client-a.
- pokretanje seeda (`prisma/seed.js`).

### 4) Prisma Studio (pregled baze).
U trećem terminalu (ili drugom, posle reset-a):

- `npx prisma studio`.

Prisma Studio tipično radi na:
- `http://localhost:5555`.

### 5) Pokretanje Next.js aplikacije.
U sledećem terminalu:

- `npm run dev`.

Aplikacija:
- `http://localhost:3000`.

> Napomena: Seed obično kreira test korisnike. Primer kredencijala (iz seed output-a):
> - admin: `admin@crm.local` / `Admin123!`.
> - sales_manager: `sm1@crm.local` / `Sales123!`.
> - freelancer: (primer iz seeda) / `Free123!`.

---

## Pokretanje Swagger UI (API dokumentacija).

Ako postoje fajlovi:
- `public/swagger/index.html`.
- `public/swagger/openapi.yaml`.

Otvori:
- Swagger UI: `http://localhost:3000/swagger/index.html`.
- OpenAPI: `http://localhost:3000/swagger/openapi.yaml`.

> Ako želiš da `http://localhost:3000/swagger` radi bez `/index.html`, napravi stranicu:
> - `app/swagger/page.tsx` koja radi redirect na `/swagger/index.html`.

---

## Pokretanje projekta uz Docker (dockernizovana verzija).

> Pretpostavke: Docker Desktop instaliran.

### 1) Struktura (primer).
Često je setup ovakav:
- `docker-compose.yaml` je u root-u repozitorijuma (može biti van `it_crm/` foldera).
- `it_crm/` sadrži ceo Next.js projekat (app/src/prisma/public/package.json).

### 2) Koncept.
Docker setup tipično sadrži:
- `db` servis (PostgreSQL).
- `web` servis (Next.js dev container).

Na startu `web` servisa se najčešće radi:
- čekanje baze da bude spremna.
- `npx prisma migrate reset` (migracije + seed).
- `npm run dev`.

### 3) Pokretanje Dockera.
U folderu gde je `docker-compose.yaml`:

- `docker compose down -v`.
- `docker compose up --build`.

Aplikacija:
- `http://localhost:3000`.

Baza:
- biće dostupna na portu koji mapira `db` servis (npr. 5432 ili custom).

### 4) Prisma Studio uz Docker.
Postoje dva najjednostavnija pristupa:

**Opcija A (najlakše): Prisma Studio lokalno, baza u Dockeru.**
- Pokreneš `docker compose up`.
- U lokalnom terminalu uđeš u `it_crm/` folder.
- Pokreneš `npx prisma studio`.
- Prisma Studio se poveže na DB kroz `DATABASE_URL` koji pokazuje na `localhost:<mapped_port>`.

**Opcija B: Prisma Studio kao poseban Docker servis.**
- Doda se još jedan servis u `docker-compose.yaml` koji startuje `npx prisma studio` i mapira port 5555.
- Korisno kada želiš da sve bude “u Dockeru”, ali je malo više konfiguracije.

---

## API (pregled glavnih ruta).

### Auth.
- `POST /api/auth/register`.
- `POST /api/auth/login`.
- `POST /api/auth/logout`.
- `GET /api/auth/me`.

### CRM.
- `GET/POST /api/client-categories`.
- `GET/POST /api/client-companies`.
- `GET/PATCH/DELETE /api/client-companies/{id}`.
- `GET/POST /api/contacts`.
- `GET/POST /api/opportunities`.
- `GET/PATCH/DELETE /api/opportunities/{id}`.

### Activities.
- `GET /api/activities?entityType=clientCompany&entityId=...`.
- `GET /api/activities?entityType=opportunity&entityId=...`.
- `POST /api/activities`.

### Metrics.
- `GET /api/metrics/...` (u zavisnosti od implementacije metrika servisa, za admin/sales manager).

---

## Bezbednosne napomene.

- Ne commituje se `.env` fajl.
- API ključevi (Pexels, Alpha Vantage) se drže isključivo u `.env`.
- Role-based pristup i scope provere su obavezne na serveru (ne oslanjati se samo na UI).

---

## Autori i repozitorijum.

- Autori: Jelena Popadić 2023/1102 i Jelena Filipović 2021/0205
- Repo: https://github.com/elab-development/internet-tehnologije-2025-it_crm_2023_1102.git

---

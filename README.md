# NEXPO IT CRM

NEXPO IT CRM je fullstack web aplikacija za upravljanje IT klijentima, projektnim zahtevima, ponudama i komunikacijom sa klijentima. Aplikacija je napravljena pomoću **Next.js**, **TypeScript**, **PostgreSQL** baze i **Drizzle ORM-a**.

Aplikacija podržava autentifikaciju korisnika, rad sa različitim korisničkim ulogama, CRUD operacije, admin analitiku, javne API integracije, Swagger/OpenAPI dokumentaciju i Docker pokretanje.

![IT CRM Logo Big](./images/logo-big.png)
![IT CRM Logo Small](./images/logo-small.png)

---

## Tehnologije

- Next.js.
- React.
- TypeScript.
- PostgreSQL.
- Drizzle ORM.
- Drizzle Kit za migracije.
- Drizzle Studio za pregled baze.
- JWT autentifikacija preko HttpOnly cookie-ja.
- Recharts za admin grafikone.
- Swagger UI + OpenAPI dokumentacija.
- Docker i Docker Compose.

---

## Glavne funkcionalnosti

Aplikacija omogućava:

- Registraciju, login i logout korisnika.
- Upravljanje korisničkim ulogama.
- Upravljanje klijentima.
- Upravljanje IT projektnim zahtevima.
- Upravljanje ponudama.
- Evidenciju komunikacije sa klijentima.
- Admin analitiku kroz grafikone.
- Pretragu tehnoloških uvida preko GitHub i Stack Overflow API-ja.
- REST API dokumentaciju preko Swagger UI-ja.

---

## Korisničke uloge

Aplikacija ima tri korisničke uloge:

| Uloga | Opis |
|---|---|
| `admin` | Ima pristup admin analitici, korisnicima i svim CRM podacima. |
| `sales_manager` | Upravlja klijentima, projektnim zahtevima, ponudama i interakcijama. |
| `it_consultant` | Pregleda klijente i projektne zahteve, i upravlja interakcijama. |

---

## Modeli i relacije

Aplikacija koristi 5 međusobno povezanih modela:

```txt
User
Client
ProjectRequest
Offer
Interaction
```

Relacije između modela:

```txt
User 1 ──── * Client
User 1 ──── * ProjectRequest
User 1 ──── * Offer
User 1 ──── * Interaction

Client 1 ──── * ProjectRequest
Client 1 ──── * Interaction

ProjectRequest 1 ──── * Offer
```

![IT CRM Logo Small](./images/IT%20CRM%20NEXPO%20-%20PMOV.png)

---

## Drizzle struktura baze

Drizzle fajlovi se nalaze u sledećim folderima:

```txt
db/schema.ts
db/index.ts
db/seed.ts
drizzle.config.ts
drizzle/
```

Opis fajlova:

| Fajl | Opis |
|---|---|
| `db/schema.ts` | Definiše tabele, enum vrednosti i relacije. |
| `db/index.ts` | Kreira konekciju ka PostgreSQL bazi. |
| `db/seed.ts` | Ubacuje test podatke u bazu. |
| `drizzle.config.ts` | Podešava Drizzle Kit migracije i konekciju. |
| `drizzle/` | Folder u kome se čuvaju generisane migracije. |

---

## Migracije

Aplikacija koristi tri različita tipa migracija:

```txt
0001_create_tables
0002_add_foreign_keys
0003_add_defaults_and_unique_constraints
```

Migracije pokrivaju:

| Migracija | Opis |
|---|---|
| `0001_create_tables` | Kreiranje tabela i osnovnih kolona. |
| `0002_add_foreign_keys` | Dodavanje spoljnih ključeva i povezivanje tabela. |
| `0003_add_defaults_and_unique_constraints` | Dodavanje default vrednosti i unique ograničenja. |

---

## API rute

Aplikacija koristi REST API rute unutar `app/api` foldera.

### Auth rute

```txt
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### CRM rute

```txt
GET    /api/clients
POST   /api/clients
GET    /api/clients/[id]
PUT    /api/clients/[id]
DELETE /api/clients/[id]

GET    /api/project-requests
POST   /api/project-requests
GET    /api/project-requests/[id]
PUT    /api/project-requests/[id]
DELETE /api/project-requests/[id]

GET    /api/offers
POST   /api/offers
GET    /api/offers/[id]
PUT    /api/offers/[id]
DELETE /api/offers/[id]

GET    /api/interactions
POST   /api/interactions
GET    /api/interactions/[id]
PUT    /api/interactions/[id]
DELETE /api/interactions/[id]
```

### Admin rute

```txt
GET    /api/admin/analytics
GET    /api/admin/users
PUT    /api/admin/users/[id]
DELETE /api/admin/users/[id]
```

### Eksterni API-ji

```txt
GET /api/external/github?keyword=Next.js
GET /api/external/stack-overflow?keyword=Drizzle
```

---

## Zaštita ruta

Aplikacija koristi JWT token koji se čuva u HttpOnly cookie-ju.

Pravila pristupa:

```txt
Clients:
GET → admin, sales_manager, it_consultant.
POST/PUT/DELETE → admin, sales_manager.

Project Requests:
GET → admin, sales_manager, it_consultant.
POST/PUT/DELETE → admin, sales_manager.

Offers:
GET/POST/PUT/DELETE → admin, sales_manager.

Interactions:
GET/POST/PUT/DELETE → admin, sales_manager, it_consultant.

Admin:
samo admin.
```

---

## Javne API integracije

Aplikacija koristi dve javne API integracije na stranici **Technology Insights**.

### GitHub Public API

Koristi se za pretragu popularnih javnih repozitorijuma za određenu tehnologiju. Ovo pomaže korisnicima da vide popularne projekte i tehnologije koje su povezane sa zahtevom klijenta.

### Stack Exchange API

Koristi se za pretragu Stack Overflow pitanja povezanih sa određenom tehnologijom. Ovo pomaže u proceni čestih problema i potencijalnih tehničkih rizika.

---

## Frontend stranice

Frontend stranice se nalaze u `app/pages` folderu.

```txt
/pages/login
/pages/register
/pages/dashboard
/pages/admin/analytics
/pages/admin/users
/pages/clients
/pages/project-requests
/pages/offers
/pages/interactions
/pages/technology-insights
```

---

## Reusable komponente

Reusable komponente se nalaze u `components` folderu.

```txt
Button.tsx
Input.tsx
Card.tsx
Modal.tsx
Navigation.tsx
```

Ove komponente se koriste na više stranica kako bi UI bio jednostavan, pregledan i lak za održavanje.

---

## Lokalno pokretanje aplikacije

### 1. Ulazak u folder projekta

```bash
cd it-crm-nexpo
```

### 2. Instalacija dependencies

```bash
npm install
```

### 3. Podešavanje `.env` fajla

U root folderu projekta kreirati `.env` fajl.

Primer za lokalni PostgreSQL:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/it_crm_nexpo"
JWT_SECRET="nexpo_secret_key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Primer za Supabase PostgreSQL:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
JWT_SECRET="nexpo_secret_key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Drizzle komande

### Generisanje migracija

```bash
npm run db:generate
```

### Pokretanje migracija

```bash
npm run db:migrate
```

### Seed baze

```bash
npm run db:seed
```

### Pokretanje Drizzle Studio-a

```bash
npm run db:studio
```

---

## Redosled za lokalno pokretanje

Nakon podešavanja `.env` fajla, pokrenuti:

```bash
npm run db:migrate
```

Zatim:

```bash
npm run db:seed
```

Zatim pokrenuti aplikaciju:

```bash
npm run dev
```

Aplikacija je dostupna na:

```txt
http://localhost:3000
```

Login stranica:

```txt
http://localhost:3000/pages/login
```

---

## Test korisnici

Seed kreira korisnike za testiranje svih uloga.

| Uloga | Email | Password |
|---|---|---|
| Admin | `jelena.popadic@nexpo.com` | `password` |
| Sales Manager | `jelena.filipovic@nexpo.com` | `password` |
| IT Consultant | `consultant@nexpo.com` | `password` |

---

## Drizzle Studio

Za pregled baze kroz Drizzle Studio:

```bash
npm run db:studio
```

Drizzle Studio će u terminalu prikazati adresu na kojoj je dostupan.

Najčešće je to:

```txt
https://local.drizzle.studio
```

ili lokalni port koji Drizzle ispiše u terminalu.

---

## Swagger UI dokumentacija

OpenAPI dokumentacija se nalazi u folderu:

```txt
public/api-doc
```

Dokumentacija je dostupna na:

```txt
http://localhost:3000/api-doc/index.html
```

Pre testiranja zaštićenih ruta u Swagger UI-ju, potrebno je prvo pozvati login rutu:

```txt
POST /api/auth/login
```

Nakon uspešnog login-a, Swagger UI šalje cookie uz naredne zahteve.

---

## Docker pokretanje aplikacije

Aplikacija se može pokrenuti i pomoću Docker-a. Docker konfiguracija sadrži tri servisa:

| Servis | Opis |
|---|---|
| `app` | Next.js aplikacija. |
| `db` | PostgreSQL baza. |
| `studio` | Drizzle Studio. |

---

## Docker fajlovi

Projekat koristi sledeće Docker fajlove:

```txt
Dockerfile
docker-compose.yml
.dockerignore
.env.docker
```

---

## `.env.docker` primer

```env
DATABASE_URL="postgresql://postgres:postgres@db:5432/it_crm_nexpo"
JWT_SECRET="nexpo_docker_secret_key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Pokretanje preko Docker-a

Pokrenuti aplikaciju komandom:

```bash
docker compose up --build
```

Aplikacija će biti dostupna na:

```txt
http://localhost:3000
```

Drizzle Studio će biti dostupan na:

```txt
http://localhost:4983
```

Swagger dokumentacija će biti dostupna na:

```txt
http://localhost:3000/api-doc/index.html
```

---

## Zaustavljanje Docker containera

Zaustavljanje containera:

```bash
docker compose down
```

Zaustavljanje containera i brisanje Docker volume-a sa podacima baze:

```bash
docker compose down -v
```

---

## Kratak opis Docker arhitekture

Docker Compose pokreće tri servisa. PostgreSQL servis čuva podatke u Docker volume-u. Next.js aplikacija zavisi od baze i pokreće se tek kada je baza spremna. Drizzle migracije i seed se izvršavaju prilikom pokretanja aplikacije, kako bi baza odmah imala potrebnu strukturu i test podatke.

Drizzle Studio je dodatni servis koji omogućava vizuelni pregled baze podataka.

---

## Zaključak

NEXPO IT CRM je jednostavna i moderna CRM aplikacija namenjena IT projektima. Sistem omogućava upravljanje klijentima, zahtevima, ponudama i komunikacijom, uz jasno razdvojene korisničke uloge i zaštićene rute.

Aplikacija koristi Next.js za frontend i backend, Drizzle ORM za rad sa bazom, PostgreSQL kao bazu podataka, javne API integracije za tehnološke uvide i Docker za jednostavno pokretanje celog sistema.

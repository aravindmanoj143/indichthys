# Indichthys

Freshwater fish taxonomy & biodiversity platform.

- **Frontend:** Angular 22 (standalone, zoneless, signals) + Spartan UI (Tailwind v4), in `src/`
- **Backend:** Node + Fastify + Prisma (SQLite now, PostgreSQL later), in `server/`

## Requirements
Node 24 LTS (Angular 22 needs Node ≥ 22.22). On this Mac it is installed keg-only via Homebrew:

```sh
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
```

## First-time setup
```sh
npm install
npm --prefix server install          # also generates the Prisma client
npm run db:migrate                   # creates server/data/indichthys.db
npm run db:seed                      # demo identification content
npm --prefix server run data:import  # real sample data from open sources (see below)
npm --prefix server run data:drive   # papers from the Drive list (see below)
```

### Sample data (`server/scripts/import-sample-data.ts`)
Fills the database from open sources, not by scraping websites. Safe to re-run (updates, never duplicates); add `-- --dry-run` to preview.
- **Publications:** ~80 recent papers on South Asian freshwater fishes from the **Crossref API** (open metadata), with species
  matched in GBIF and topics tagged from titles. Parasite papers, errata and duplicate editions are filtered out.
- **News:** "new species" / "taxonomic update" posts generated from the newest of those papers (citation + DOI link).
- **Organisations, funding & fellowship programmes, conservation initiatives:** short curated lists of real organisations and
  recurring programmes with checked links. No deadlines are invented; listings point to the official sites.
- **Events & external courses:** a few upcoming conferences and courses, each with dates/fees confirmed on the organiser's page.
- **Sample ichthyologists:** only the people listed in `SAMPLE_PEOPLE` in the script. Marked *demo*, unverified, no
  account or email, public facts only; their papers are linked when Crossref lists them by exact name. Remove them
  before going live, or once a person creates their own profile.
  Aravind Manoj's profile uses his own research portfolio (bio, interests, ResearchGate, his listed papers by DOI and
  the *Fishes of Chennai* field guide); co-authors who also have a sample profile are credited too.
- **Not imported on purpose:** job vacancies (short-lived).

### Papers from the owner's Google Drive (`server/scripts/import-drive-papers.ts`)
`npm --prefix server run data:drive [-- --dry-run]` imports the research papers listed in
`server/scripts/data/drive-papers.json`, which was built from the PDF file names (author, year, species) in the owner's
Drive. Only that short query is sent to Crossref, never file contents. A record is accepted only if its title contains
the species name, the named author is on it and the year matches (±1). Papers without a confident match are listed
and skipped. Add a paper by appending `{ "query", "keys", "author", "year" }` to the JSON.

## Run (two terminals)
```sh
npm run api        # API on http://localhost:3000 (auto-reloads)
npm start          # app on http://localhost:4200; /api is proxied to the API
```

## Test & build
```sh
npm test           # frontend unit tests (Vitest)
npm run api:test   # backend unit tests (node:test)
npm run build      # production build -> dist/
```

## Modules
| # | Module | Status | Data |
|---|--------|--------|------|
| 1 | Fish Taxonomy & Biodiversity (`/taxonomy`) | done | Live GBIF API |
| 2 | Fish Identification (`/identification`) | done, except AI features | Indichthys API (SQLite) |
| 3 | Research & Publications (`/publications`) | done | Indichthys API + Crossref |
| 4 | Ichthyologist Registry (`/ichthyologists`) | done | Indichthys API (SQLite) |
| 5 | Courses & Education (`/learning`, `/workshops`) | done | Indichthys API |
| 6 | Fieldwork: Observations (`/observations`) | observations done; surveys & expeditions not yet | Indichthys API + OpenStreetMap |
| 7 | Conservation & Organisations (`/conservation`, `/threatened`, `/organisations`) | done, except endemic-species list | API + live GBIF |
| 8 | Research Grants & Funding (`/grants`, `/fellowships`) | done | Indichthys API |
| 9 | Jobs & Opportunities (`/jobs`) | done | Indichthys API |
| 10 | Research Tools (`/tools`) | directory of tools & links | Static list: `src/app/features/tools/research-tools.data.ts` |
| 12 | Specimen & Museum Collections (`/specimens`) | done (read-only) | Live GBIF |
| 14 | News & Events (`/news`, `/events`) | done | Indichthys API |

### Module 2: Fish Identification
| Feature | Where |
|---|---|
| Key identification: browse taxa → key characters + morphological, meristic & morphometric profile | `/identification/taxa` (`GET /api/identification/taxa`, `…/taxa/:id/profile`) |
| Regional identification guides | `/identification/guides/:slug` |
| Expert identification requests (with photos) | `/identification/requests`, `…/new` |
| Identification verification & validation | Proposals + agree/disagree reviews on each request |
| AI-based identification, image-based species search | **Not implemented.** Integration point: `server/src/modules/identification/ai/ai-provider.ts` (API returns 501) |

Verification rule (`server/src/modules/identification/constants.ts`): a proposal is verified when ≥ 2 people agree,
≥ 1 of them an expert, and expert agreements outnumber expert disagreements.

Proposing and reviewing identifications requires signing in; "expert" means the person has a **verified**
ichthyologist profile (Module 4). The status is stored with each proposal/review as it was at the time.
All seeded identification content is **demo** data; the carp meristic/morphometric ranges are approximate.
Keys, guides and characters have no authoring UI yet (edit via the seed or `npm --prefix server run db:studio`).

### Module 4: Ichthyologist Registry
| Feature | Where |
|---|---|
| Ichthyologist profiles | `/ichthyologists/:slug`; edit at `/account/profile` |
| Researcher directory (search, expertise, region, verified, open to collaboration) | `/ichthyologists` |
| Areas of expertise (disciplines, fish groups, regions) | Controlled list, seeded in `server/prisma/seed.ts` |
| Institutional affiliations | Search existing institutions or add new ones while editing a profile |
| Research interests | Free-text tags on the profile |
| Publications & contributions | Publications with Crossref DOI lookup; identification stats from Module 2 |
| Contact & collaboration requests | Form on each profile → owner's `/account/inbox` (sender email visible only to the owner) |
| Expert verification | Owner requests with evidence → admin approves at `/admin/verification`; renaming resets it |

### Module 5: Courses & Education
| Feature | Where |
|---|---|
| Courses in ichthyology, fish taxonomy, identification, photography, morphometrics | `/learning` catalogue (filter by subject, provider, search) |
| Learning materials | 4 free Indichthys courses with lessons (`server/prisma/learning-content.ts`, loaded by `npm run db:seed`) |
| Certificates & assessments | Each Indichthys course ends with a quiz; ≥ 80% issues a certificate with a public verification page (`/learning/certificates/:code`), printable as PDF |
| Online workshops & field training | `/workshops`: the events list limited to workshops, field courses and webinars (organisers submit them like any event) |
| External courses | Listings of courses by other institutions (in `server/scripts/import-sample-data.ts`) |

Progress (lessons completed) and certificates need sign-in; lessons themselves are open to everyone.

### Module 3: Research & Publications
| Feature | Where |
|---|---|
| Research paper repository; species descriptions, taxonomic revisions, reports, books & field guides | `/publications` (search, type, year range, journal, topic, species and author filters) |
| DOI & citation management | Add by DOI (Crossref fills the details; duplicates are detected). Each publication shows a citation, BibTeX and RIS to copy or download |
| Bibliography management | Bookmark publications into **My library** (`/publications/library`) and export BibTeX, RIS (Zotero/EndNote/Mendeley) or a reference list |
| Scientific journals | `/publications/journals`: key ichthyology journals with links, plus journals in the repository with counts |
| Research author profiles | Researchers claim authorship ("I'm an author"); papers appear on their profile and vice versa |
| Research topic directory | `/publications/topics`: the shared expertise topics with publication and researcher counts |

Members (signed in) add publications; the person who added one, or an admin, can edit it; admins can delete.
Species tags link to the Taxonomy pages (and each species page can be searched for "other papers").

### Module 6: Fieldwork — Observations
iNaturalist-style sightings with a map (Leaflet; OpenStreetMap and Esri satellite tiles).
- **Add** (`/observations/new`, signed in): up to 6 photos, species from GBIF (or a genus/family name, or blank),
  date/time and location. Date and GPS are read from the first photo's EXIF; "Use my location" uses the browser's GPS;
  clicking the map places the point. Optional water body, habitat, count, captive flag and notes. Owners can edit or delete.
- **Browse** (`/observations`): map + list, filter by name, quality grade, "only in map area" and "my observations".
- **Identify**: anyone signed in can agree or suggest another name (with a comment); a new ID replaces your earlier one,
  and IDs can be withdrawn. The community taxon is the most common current ID.
- **Quality grade**: *casual* (no photo, date or location, or captive) → *needs ID* → *research grade* (≥2 agreeing
  species-level IDs and more than two thirds agreement). Logic and tests: `server/src/modules/observations/quality.ts`.
- **Location privacy**: "obscured" stores the exact point but shows everyone else the centre of a 0.2° (~20 km) cell;
  map and area searches use only the public point, so the true spot can't be narrowed down by searching.

### Modules 7, 8, 9, 12, 14
| Module | What's there |
|---|---|
| 14 News & Events | News by category (new species, taxonomic updates, research, conservation, announcements), written by admins at `/admin/news`. Events calendar (upcoming/past, by type) with registration deadlines; members submit events. |
| 8 Grants & Funding | Research, conservation, government and CSR funding, fellowships, funded projects and proposal resources, with deadlines ("closes in N days"), eligibility and apply links. |
| 9 Jobs | Jobs, research assistant, field biologist, PhD, postdoc, internship, volunteer and fellowship posts. Closed posts are hidden unless asked for. `/fellowships` lists fellowships from both 8 and 9. |
| 7 Conservation | Projects, initiatives and citizen programmes (members submit). Threatened species recorded in India by IUCN category (live GBIF; "freshwater only" uses GBIF species profiles). Organisation directory built from institutions, with their researchers, projects and open opportunities. |
| 12 Specimens | Preserved fish specimens from museum collections on GBIF: search, type-status filter (holotype, paratype…), holding-collection directory with museum names from the GBIF registry, specimen pages with locality, collector, photos and links. |

**Moderation:** events, opportunities and conservation projects from members are *pending* until an admin publishes
them at `/admin/moderation` (the header shows a count). Admins' own posts publish immediately. Members see the status of
what they posted at `/account/submissions`. Submitted items can't yet be edited after posting.

**Not included:** endemic-species database (GBIF has no reliable endemism flag; needs a curated list) and habitat-degradation reports.

### Accounts & admins
- Sign up at `/account/register` (password ≥ 10 characters; stored as a scrypt hash).
- Sessions are httpOnly cookies (30 days). Every API write must send the `x-indichthys: 1` header
  (the Angular app adds it), which blocks cross-site form posts.
- Login, registration and contact forms are rate-limited per IP.
- Make someone an admin (they must register first):
  ```sh
  npm --prefix server run user:admin -- someone@example.org          # grant
  npm --prefix server run user:admin -- someone@example.org --revoke # remove
  ```
- Not yet built: password reset by email, email notifications for new messages, moderation tools.

## Structure
```
src/app/core/navigation.ts          8 nav sections grouping the 15 modules
src/app/features/taxonomy/          Module 1 (GBIF client, search, checklist, tree, species page)
src/app/core/                       Navigation, auth service, CSRF header interceptor, route guards
src/app/features/identification/    Module 2 (API client, hub, key identification, guides, requests)
src/app/features/registry/          Module 4 (directory, profiles, my profile, inbox, admin verification)
src/app/features/account/           Sign in / create account
src/app/features/content/           Modules 7, 8, 9, 14 (news, events, opportunities, conservation, organisations, moderation)
src/app/features/specimens/         Module 12 (GBIF museum specimens)
src/app/features/publications/      Module 3 (repository, citation formats, journals, topics, library)
src/app/features/tools/             Module 10 (research tools directory)
src/app/features/learning/          Module 5 (catalogue, lessons, quiz, certificates)
libs/ui/                            Spartan helm components (generated, owned by us)
server/prisma/schema.prisma         Database schema
server/prisma/seed.ts               Demo data (idempotent)
server/src/modules/auth/            Passwords, sessions, auth routes (+ tests)
server/src/modules/identification/  Routes, validation, key-path & verification logic (+ tests)
server/src/modules/registry/        Ichthyologist registry routes & validation
server/src/modules/content/         News, events, opportunities, conservation, organisations, moderation
server/src/modules/publications/    Publication repository, journals, topics, library, authorship
server/src/modules/learning/        Courses, lessons, quiz scoring, certificates
server/scripts/make-admin.ts        Grant/revoke the admin role
server/uploads/                     Uploaded photos (git-ignored)
```

## Moving from SQLite to PostgreSQL
The schema avoids SQLite/Postgres differences (no Prisma enums, Json or scalar lists).
1. `npm --prefix server i @prisma/adapter-pg pg`
2. In `server/prisma/schema.prisma` set `provider = "postgresql"`.
3. In `server/src/db.ts` replace the SQLite adapter with `new PrismaPg({ connectionString: config.databaseUrl })`.
4. Set `DATABASE_URL="postgresql://…"` in `server/.env`.
5. Delete `server/prisma/migrations/` (they are SQLite-specific), then `npm run db:migrate` and `npm run db:seed`.
6. To keep existing data, copy it across (e.g. with `pgloader`) before going live.
7. Text search uses Prisma `contains`, which is case-insensitive on SQLite but case-sensitive on Postgres:
   add `mode: 'insensitive'` to those filters in `server/src/modules/registry/routes.ts` and
   `server/src/modules/content/routes.ts` and `server/src/modules/publications/routes.ts` after switching.

## Data sources
Taxonomy and occurrence data come live from the public GBIF API (https://api.gbif.org/v1); no login is
needed for these read-only endpoints. GBIF credentials are only required for occurrence *downloads*.
If those are added, keep the credentials on the server, never in the Angular app.

## Deploy (Render)
`render.yaml` is a Render blueprint: one Node web service that builds the Angular app, creates the SQLite database
(migrate, seed, sample data, Drive papers) and serves the app and `/api` from Fastify (`WEB_ROOT`).
1. In Render: **New → Blueprint**, connect this GitHub repo, apply.
2. Set `ADMIN_EMAILS` to your email, then register with that email on the site to get an admin account.
3. If the service URL differs from `https://indichthys.onrender.com`, update `CORS_ORIGINS`.

Free-plan caveats: the service sleeps after ~15 min idle (first request takes ~1 min), and without a persistent disk
the database is rebuilt on every deploy, so accounts and submissions are lost. For lasting data add a Render disk and
set `DATABASE_URL=file:/var/data/indichthys.db`, or migrate to Postgres (see above).

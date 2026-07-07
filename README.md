# myGFO — eTechLog & Flight Operations (Prototype)

Interactive prototype for **myGFO**, a Global Flight Operations platform for a corporate
(Part 91) Gulfstream flight department. This repo is the **design/demo build** — a working,
mock-data application used to validate workflows ahead of the production system. It is **not**
the production system of record.

Current focus is the **electronic Tech Log (eTechLog)** module — offline journey log, defects,
MEL deferrals, e-signature, and maintenance release — alongside the supporting flight-ops and
scheduling workflows.

## Quick start

```bash
npm i          # install dependencies
npm run dev    # start the Vite dev server
```

Copy `.env.example` to `.env` and fill in the values before running the database- or auth-backed
features.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server (Vite) |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run type-check` | TypeScript check (`tsc --noEmit`) |
| `npm test` | Run the test suite (Vitest) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run db:push` | Push the Drizzle schema to the database |
| `npm run db:seed` | Seed mock data |
| `npm run db:studio` | Open Drizzle Studio |

## What's in the build

Active modules and recent build items:

- **eTechLog** — journey log, defects, MEL deferrals, e-signature, maintenance release, and the
  maintenance⇄pilot handover flow.
- **Coming Due / Watchlist** — maintenance items approaching their due condition.
- **Scheduling board** — drag-and-drop watchlist scheduling with a derived serviceability (RAG)
  projection.
- **Global notifications** — cross-module alerting.
- Supporting flight-ops workflows — scheduling, safety/hazard reporting (with anonymous
  reporting), document management, and crew management.

Work currently in review is visible in the repo's **open pull requests**.

## Tech stack

- **Frontend:** Vite 6 + React 18 + TypeScript, Tailwind CSS 4, Radix UI, `react-dnd`, Recharts
- **API:** Hono (`api/`), Drizzle ORM on Neon (serverless Postgres)
- **Auth:** Microsoft Entra ID via MSAL
- **Deploy:** Vercel
- **Tests:** Vitest

## Project docs

The authoritative specs, decisions, and review findings live in the project's Obsidian vault
(`myGFO / 02-Platform / Tech Log`), not in this repo. In-repo, `CLAUDE.md` captures the working
agreement and the safety-critical rules for the eTechLog module — read it before contributing.

---

*Prototype with mock data. Not the authoritative maintenance record — do not use for actual
airworthiness decisions.*

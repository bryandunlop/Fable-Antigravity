# myGFO role training guides

Ten Word documents, one per role, covering the day-to-day myGFO screens. Every screenshot
is captured from the running prototype and carries numbered callouts that match the
numbered explanations underneath it in the document.

## The documents

| # | Document | Type | Screens |
| --- | --- | --- | --- |
| 01 | Pilot | base | 10 |
| 02 | Chief Pilot | supplement to Pilot | 5 |
| 03 | Flight Attendant | base | 12 |
| 04 | Flight Attendant Manager | supplement to Flight Attendant | 3 |
| 05 | Scheduling | base | 10 |
| 06 | Scheduling Manager | supplement to Scheduling | 2 |
| 07 | Maintenance | base | 14 |
| 08 | Chief Inspector | supplement to Maintenance | 2 |
| 09 | Director of Maintenance | supplement to Maintenance | 3 |
| 10 | Lead Team | base | 11 |

Base documents stand alone. Supplements cover only what is additional to their base role and
say so on the title page — they are not complete on their own.

## Scope

Covered: the day-to-day screens each role reaches from its sidebar.

**Not covered, by decision:**

- **Tech Log** — has its own checklist documentation.
- **Irregularity Reports (FIR)** — has its own checklist documentation.
- **Scheduling Command Center** — has its own checklist documentation.
- **Safety** (`/safety`, ASAP, hazard reporting, safety centre) — not in service yet.

FRAT and GRAT *are* covered. They sit in the Flight Ops and Maintenance domains rather than
the Safety domain and are part of the daily preflight / pre-task flow, so excluding them
would have left a hole in the Pilot and Maintenance guides. Say the word if you want them
pulled out.

Each document states these exclusions on its title page, because the excluded items are
still visible in the sidebar and a reader would otherwise assume the guide was incomplete.

## Role gaps found while writing these

Three are recorded in the documents themselves, in a "Known gap" box:

1. **Scheduling Manager has no pages at all.** The role is selectable but appears on zero
   navigation entries, so it signs in to an empty sidebar, and the scheduling pages return
   *Access Denied* (restricted to `scheduling`, `admin`, `lead`). Document 06 records the
   gap and tells the reader to work under the Scheduling role meanwhile.
2. **Flight Attendant Manager cannot see the Inflight pages.** `fa-manager` is not granted
   Upcoming Trips, Passenger Database, Catering Tracker or Post-Flight Checklist, so a
   manager sees a narrower sidebar than the crew they manage.
3. **Chief Pilot cannot open Crew Workload.** `/crew-scheduling-workload` is restricted to
   `scheduling`, `admin` and `lead`.

Also worth a look, not blocking:

- **Chief Inspector has no inspection-specific surface** — it currently carries the same
  page set as Maintenance plus Approvals. RII enforcement is still blocked on the
  operator-defined ATA chapter list (open question 3 in `CLAUDE.md`).
- **FRAT Submissions contradicts itself** on demo data: the counters read 8 total / 2 drafts
  / 3 approved while the list below reads "0 submissions — you haven't submitted any FRAT
  forms yet".
- **Scheduling Dashboard shows `-Infinity`** for *Est. Total Delay (min)* when no leg carries
  a delay estimate.

## Regenerating

The screenshots are captured from the running app, so they go stale when the UI changes.
Everything needed to rebuild them is in `generator/`.

```bash
# 1. run the app
npm run dev                       # http://127.0.0.1:3000

# 2. from docs/training/generator, with playwright + docx installed
node annotate.mjs ./shots         # capture 56 annotated screenshots
node gendocs.mjs ./shots ./out    # build the 10 .docx files
```

The raw PNGs are deliberately not committed — they are embedded in the `.docx` files and are
reproducible from `annotate.mjs`, so committing them would duplicate ~21 MB.

| File | What it holds |
| --- | --- |
| `manifest.mjs` | Which pages each role can reach, and the login label per role |
| `shotlist.mjs` | The 56 screenshots, and the callout target for each number |
| `annotate.mjs` | Signs in per role, navigates, draws the numbered callouts, screenshots |
| `content.mjs` | All document prose, per role and per callout |
| `gendocs.mjs` | Builds the `.docx` files |
| `preview.mjs` | Renders a `.docx` in Chromium for visual checking |

### Notes for whoever picks this up

- `annotate.mjs` writes `_audit.txt` next to the screenshots, listing the text it *searched
  for* against the text it *actually matched*. Read it after any UI change — Playwright's
  text matching is case-insensitive and substring-based, so a callout can silently land on
  the wrong element (`NEEDS PREP` matched the `Needs prep only` filter button until this
  was caught). It also flags callouts that fall below the fold and would draw off-canvas.
- Callout targets prefixed `css=` use a CSS selector; `exact: true` forces a full,
  case-sensitive text match.
- LibreOffice is broken in the CI container, so `preview.mjs` renders the real OOXML in
  Chromium via `docx-preview` instead. It does not compute page numbers — the footer
  renders correctly in Word.

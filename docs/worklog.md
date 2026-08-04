# Work Log — tracking hours on myGFO

A personal effort tracker. Two streams of work, one table, one page:

- **Assisted build sessions** — reconstructed from this repository's git history by a script. You do not log these by hand.
- **Everything else** — design, meetings, testing, research, vendor calls — tapped into the phone as it happens, or right after.

It is **not part of the myGFO product**. No nav entry, no sidebar link, no command-palette result, no role gate, and nothing in flight ops imports it. It shares the database and the deployment only because those already exist and already reach the phone. The `work_log_entries` table has no foreign key in either direction and could be dropped without touching a single flight-ops row.

The door is the URL: **`/worklog`**.

---

## Fiscal year

FY runs **1 July → 30 June**, labelled by the year it ends in. FY27 is 1 Jul 2026 → 30 Jun 2027.

Every date in the system is a plain `YYYY-MM-DD` calendar day, and the FY is computed from that string rather than from a timestamp. This matters here: commits in this repo carry offsets from `-0400` to `+0200`, and a fiscal year derived from an instant puts a session committed at 00:30 on 1 July in Europe into the *previous* fiscal year. The day the work happened is the day it counts against, wherever the laptop was.

---

## What the git history says

Run the derivation at any time — it reads git and writes nothing unless you pass `--seed`:

```bash
npx tsx scripts/derive-work-sessions.ts
```

As of 4 Aug 2026, from 343 non-merge commits:

| Fiscal year | Hours | Sessions | Days worked | Range |
|---|---|---|---|---|
| FY26 | 1.5 | 3 | 3 | 22–24 Jun 2026 |
| **FY27** | **81.4** | **47** | **24** | 2 Jul – 4 Aug 2026 |
| | **82.9** | **50** | **27** | |

### How a session is derived

1. Take every non-merge commit's **author** timestamp — when the work happened, not when a rebase or merge rewrote it.
2. Sort ascending, and cut a new session wherever the gap to the next commit exceeds **90 minutes**. A gap that long is a break, not thinking.
3. Score the session as `(last commit − first commit) + 25 minutes`. The ramp-up is there because a session's first commit is preceded by unrecorded work: reading, planning, and the edits that produced it.
4. Floor each session at **30 minutes**, so a lone commit is not scored zero.

### Why those thresholds are not arbitrary

The inter-commit gap distribution in this repo is sharply bimodal — median **8.7 min** inside a session, p90 over **4 hours** between them. Only 12 of 342 gaps fall between 90 minutes and 4 hours, so the session boundaries sit in an empty valley and are not an artifact of where the threshold was placed.

The *scoring* is more sensitive than the *cutting*, which is why the parameters are flags:

| | Total |
|---|---|
| `--gap 60 --ramp 15 --min 30` (tight) | 69.5 h |
| **default** (`90 / 25 / 30`) | **82.9 h** |
| `--gap 120 --ramp 30 --min 45` | 90.8 h |
| `--gap 120 --ramp 45 --min 60` (generous) | 102.8 h |

The default is deliberately conservative.

### What this number is not

**It is a floor, not a total.** Git only sees work that produced a commit. Absent from it:

- Design discussion and planning that ended in a decision rather than a diff
- Review, reading, and regulatory research
- Testing on the iPad
- Debugging that never landed
- **All work before 22 June 2026** — this repository's history begins there, while `docs/superpowers/` carries plans dated back to 15 May 2026. That work is real and is not in the 82.9 h.

Correct any of it by hand in the app, or log the missing time as manual entries. A derived row you have edited is never overwritten by a re-run (see below).

---

## Seeding the derived sessions

```bash
npx tsx scripts/derive-work-sessions.ts --seed
```

Reads `DATABASE_URL` from `.env.local` and writes straight to Postgres — no running server needed.

**Re-running is safe.** Each session's id is derived from the instant of its first commit, so the same session keeps the same row forever. On a re-run:

- a session not yet in the table is **inserted**;
- a session whose row you have **not** touched is **refreshed** (its span may have grown as more commits landed);
- a session whose row you **have** edited by hand is **left alone**.

The distinction is made by comparing `createdAt` with `updatedAt` — an untouched row still has them equal — so no extra column is needed to carry it.

Run it again whenever you want the log brought up to date; a weekly habit keeps FY totals honest without any bookkeeping.

---

## Logging everything else, from the phone

Open `/worklog` on the phone. Two ways in, both built for one-handed use with 44px targets:

**A running timer.** Pick a category, hit *Start*. The timer survives a reload, a backgrounded tab, and a locked phone — it stores the start instant, not a tick count. *Stop & log* writes the entry.

**After the fact.** Tap a category chip, tap a duration chip (15m through 3h, or type a custom number of minutes), optionally set a date and a note, tap *Log*. This is the path you will use most: it takes about three seconds walking out of a meeting.

### Categories

`Solo build`, `Design`, `Meetings`, `Testing`, `Research`, `Spec`, `Vendor`, `Admin`, `Other` — plus `Assisted build session`, which is what derived rows are filed under and is not offered on the form.

They are stored as free text, not a database enum, on purpose. The list is a note to yourself about where time went and it will keep growing; if adding "vendor call" cost a schema migration, it would simply never get added. Edit `CATEGORIES` in `src/components/worklog/workLog.ts`.

### It works with no signal

Hangars and ramps do not have usable wifi, so no write is allowed to depend on one. Every entry lands in local state and `localStorage` immediately and is queued for the server. The queue drains on load, when the browser reports it is back online, and after each successful write. A banner shows how many entries are still waiting.

Ids are generated on the phone, so a retry after a lost response is a no-op rather than a duplicate row.

### Putting it on the home screen

Open `/worklog` in Safari → Share → **Add to Home Screen**.

The page swaps the document's manifest link to `/worklog-manifest.json` while it is mounted, whose `start_url` is `/worklog`. Without that, iOS reads the app manifest — `start_url: "/"` — and the icon you just made to log time would open the flight-ops dashboard instead. The swap is undone when the page unmounts and touches no product file.

---

## Setup

The table is created by a schema push, matching how the rest of this project's database is managed (there are no migration files):

```bash
npm run db:push
```

Then seed the derived history:

```bash
npx tsx scripts/derive-work-sessions.ts --seed
```

---

## Where things live

| Path | What |
|---|---|
| `src/components/worklog/workLog.ts` | Fiscal-year math, categories, aggregation, CSV. Pure. |
| `src/components/worklog/sessionClustering.ts` | Commits → sessions. Pure, and in `src/` so the suite reaches it — this is what decides the hours. |
| `src/components/worklog/useWorkLog.ts` | Local-first data layer with the offline outbox. |
| `src/components/worklog/WorkLogPage.tsx` | The page. |
| `src/server/routes/worklog.ts` | `GET` / `POST` / `PATCH` / `DELETE` `/api/worklog`. |
| `scripts/derive-work-sessions.ts` | Git reader, reporter, seeder. |
| `public/worklog-manifest.json` | Home-screen manifest scoped to `/worklog`. |

Tests: `workLog.test.ts` (28), `sessionClustering.test.ts` (15), `worklog.test.ts` (25).

---

## Export

The **CSV** link under the entry list exports the selected fiscal year: one row per entry, oldest first, with date, FY, decimal hours, minutes, category, source, commit count and note.

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

## The repositories

myGFO has lived in more than one repository, and a single afternoon often touches several. They are all read into **one pooled timeline**:

| Repository | What it is | Range |
|---|---|---|
| `Fable-Antigravity` | The current app | 22 Jun – 4 Aug 2026 |
| `Antigravity-Aviation-Management-System` | Its predecessor — tech log work starts here | 15 Feb – 24 Jun 2026 |
| `myGFO-vault` | Strategy, meetings, stakeholders, platform notes | 14 Jul – 4 Aug 2026 |
| `myGFO-iOS` | The iOS/Capacitor wrapper | 16 Mar – 27 Jul 2026 |
| `mygfo-ios-app` | The earlier Swift app | 15 Mar – 8 Jun 2026 |
| `antigravity-vault` | Predecessor vault | 3–7 Jun 2026 |
| `Aviationmanagementsystem` | The original spike | 7 Dec 2025 |

Pass them all in one run:

```bash
npm run worklog:derive     # report only
npm run worklog:seed       # report, then write to the database
```

Those scripts assume the other repositories are **siblings of this one** (`../myGFO-vault`, and so on). If yours live elsewhere, edit the `--repos` list in `package.json` once, or pass your own:

```bash
npx tsx scripts/derive-work-sessions.ts --repos "/path/one,/path/two"
npx tsx scripts/derive-work-sessions.ts --repo /path/one --repo /path/two
```

**Pooling before clustering is the point.** An afternoon spent moving between the app, the iOS wrapper and the vault is *one sitting*. Deriving each repo separately and adding the totals would bill it two or three times over. Pooled, those commits interleave into a single session.

**Duplicates are dropped.** `Fable-Antigravity` was forked out of `Antigravity-AMS` in June 2026, so four handover commits exist verbatim in both — same author instant, same subject. They are matched on those two fields rather than on SHA, because a fork rewrites SHAs when history is squashed or grafted but changes neither when the work happened nor what it was called.

## What the git history says

Run the derivation at any time — it reads git and writes nothing unless you pass `--seed`:

```bash
npx tsx scripts/derive-work-sessions.ts        # this repo only
```

As of 4 Aug 2026, from **946 non-merge commits across all seven repositories** (4 duplicates dropped). This table is a snapshot — every commit after it moves the figures, so re-run rather than quoting these:

| Fiscal year | Hours | Sessions | Days worked | Range |
|---|---|---|---|---|
| FY26 | 74.6 | 62 | 41 | 7 Dec 2025 – 24 Jun 2026 |
| **FY27** | **93.8** | **51** | **25** | 2 Jul – 4 Aug 2026 |
| **Total** | **168.4** | **113** | **66** | |

By repository — note that a session spanning repos counts once against *each*, so these deliberately sum to more than the total. They answer "how much did this repo appear in", not "how do the hours divide":

| Repository | Hours | Sessions |
|---|---|---|
| Fable-Antigravity | 92.3 | 49 |
| Antigravity-AMS | 56.9 | 45 |
| myGFO-vault | 53.6 | 28 |
| myGFO-iOS | 34.0 | 20 |
| mygfo-ios-app | 20.0 | 10 |
| antigravity-vault | 7.0 | 4 |
| Aviationmanagementsystem | 0.5 | 1 |

### How a session is derived

1. Take every non-merge commit's **author** timestamp — when the work happened, not when a rebase or merge rewrote it.
2. Sort ascending, and cut a new session wherever the gap to the next commit exceeds **90 minutes**. A gap that long is a break, not thinking.
3. Score the session as `(last commit − first commit) + 25 minutes`. The ramp-up is there because a session's first commit is preceded by unrecorded work: reading, planning, and the edits that produced it.
4. Floor each session at **30 minutes**, so a lone commit is not scored zero.

### Why those thresholds are not arbitrary

The inter-commit gap distribution in this repo is sharply bimodal — median **8.7 min** inside a session, p90 over **4 hours** between them. Only 12 of 342 gaps fall between 90 minutes and 4 hours, so the session boundaries sit in an empty valley and are not an artifact of where the threshold was placed.

The *scoring* is more sensitive than the *cutting*, which is why the parameters are flags:

| | FY26 | FY27 | Total |
|---|---|---|---|
| `--gap 60 --ramp 15 --min 30` (tight) | 62.6 h | 78.7 h | 141.3 h |
| **default** (`90 / 25 / 30`) | **74.6 h** | **93.8 h** | **168.4 h** |
| `--gap 120 --ramp 30 --min 45` | 88.8 h | 103.7 h | 192.5 h |
| `--gap 120 --ramp 45 --min 60` (generous) | 103.0 h | 115.5 h | 218.5 h |

The default is deliberately conservative. Note that the *days worked* figure — 41 in FY26, 25 in FY27 — does not move across any of these settings. The calendar is solid; only what a day is worth is a judgement call.

### What this number is not

**It is a floor, not a total.** Git only sees work that produced a commit. Absent from it:

- Design discussion and planning that ended in a decision rather than a diff
- Review, reading, and regulatory research
- Testing on the iPad
- Debugging that never landed
- Any repository not in the list above

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

Run it again whenever you want the log brought up to date; a weekly habit keeps FY totals honest without any bookkeeping. **Pass the same `--repos` list every time.**

### If you change the repository list

Use `--seed --replace`.

Session ids are keyed on the instant of a session's first commit, so adding a repository can merge two sessions into one or shift a boundary. The rows under the old ids then become orphans that no future run will ever touch again, quietly inflating the total. `--replace` clears every `source='git'` row first and rebuilds them. Hand-logged entries are never touched by it.

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

## Setup — there isn't any

Open `/worklog`. That is the whole procedure.

**The table creates itself.** Every handler runs through `withTable`, which on Postgres `42P01` (undefined_table) issues `CREATE TABLE IF NOT EXISTS` and retries the query once. Once, not in a loop — a second `42P01` means the DDL did not take (no permission, wrong database) and that needs a person, not a retry.

This is safe *here specifically* because `work_log_entries` is a personal table with no foreign key in either direction. It is not a licence to self-migrate product tables. The column list matches the Drizzle schema exactly, so a later `npm run db:push` is a no-op rather than a diff.

**The history ships with the page.** `public/worklog-seed.json` carries the derivation, and the client applies it once per device — so the full fiscal year is on screen at first paint with no database, no script, and no signal. It is then pushed to Postgres in a single `/bulk` request. Ids are deterministic, so that push cannot duplicate what the CLI seeder wrote, in either order.

The seed applies **once per device**, guarded on a stored flag rather than on "is the log empty" — otherwise a derived row you deleted on purpose would come back on the next load. Sessions derived *after* the bundle was generated arrive the normal way, from the database, once you re-run `worklog:seed`.

If you prefer to do it explicitly, both still work and neither is required:

```bash
npm run db:push        # create the table up front
npm run worklog:seed   # push the derivation to the database
npm run worklog:bundle # regenerate the static seed after new work lands
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

// Seed content for the unified Document Compliance module. Realistic GFO
// content; dates are computed relative to load time so the demo's review/ack
// clocks stay meaningful (a DATA_VERSION bump migrates the stored state
// forward — see engine/migrations.ts; only a fresh install re-seeds).
import type { Doc, DocRevision, DocAcknowledgment, DocComment, DocSuggestion, DocSuggestionReply, DocumentsState, DocCmcRow } from './types';
import type { Signature, AircraftType, CasColor } from '../tech-log/types';
import { SEED_BULLETINS } from '../bulletins/mockData';
import { bulletinToDocAndRevision } from './engine/bulletinCompat';
import { mockSha256 } from '../tech-log/engine/signing';
import { sectionsFromMarkdown, checksumForSections, contentFieldsFromMarkdown } from './engine/blocks';
import { receivedPlaceholderSections } from './engine/provenance';
import {
  MEL_DEMO_BLOB_KEY, MEL_DEMO_BYTE_LENGTH, MEL_DEMO_FILENAME, MEL_DEMO_SHA256,
} from './store/demoSeedBlob';
import { stepFormToSections, type StepFormModel } from './engine/stepForm';
import { applyComplianceRefs } from './engine/regCatalog';
import { operatorTodayIso } from '../../lib/operatorDate';

function daysFromNow(n: number): string {
  // Anchor seed dates to the operator calendar day (D24) so they agree with
  // the app's effective/overdue comparisons near UTC midnight.
  const d = new Date(`${operatorTodayIso()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const SOP1_R1_CONTENT = `# Stabilized Approach Criteria

## Purpose
Defines the company stabilized approach gates and mandatory go-around policy for all fleet aircraft.

## Criteria (all must be met)
By **500 ft AFE** (all approaches):
- On the correct flight path, only small heading/pitch corrections required
- Speed within +10/−5 of VREF-derived target
- Aircraft in final landing configuration, checklist complete
- Sink rate ≤ 1,000 fpm unless briefed
- Engines spooled

## Go-Around Policy
If any gate is not met, or becomes unmet below the gate, **go around**. No discussion, no penalty — company policy is unconditional support of the go-around decision.

## Reporting
File an event debrief note for any go-around so Standards can track trends.`;

const SOP1_R2_CONTENT = `# Stabilized Approach Criteria

## Purpose
Defines the company stabilized approach gates and mandatory go-around policy for all fleet aircraft.

## Criteria (all must be met)
By **1,000 ft AFE** (circling approaches) / **500 ft AFE** (straight-in):
- On the correct flight path, only small heading/pitch corrections required
- Speed within +10/−5 of VREF-derived target
- Aircraft in final landing configuration, checklist complete
- Sink rate ≤ 1,000 fpm unless briefed
- Engines spooled

## Go-Around Callout (standardized)
Either pilot calls **"GO AROUND"**; the response is immediate execution of the published missed approach or ATC instruction. No discussion, no penalty — company policy is unconditional support of the go-around decision.

## Reporting
File an event debrief note for any go-around so Standards can track trends.`;

const SOP2_CONTENT = `# EFB Chart Currency Verification

## Purpose
Formalizes the interim workflow from FOB-001 into a standing SOP for verifying EFB chart currency before the first leg of a trip.

## Procedure
1. On the day of departure, open the EFB and confirm the coverage cycle is current.
2. If an update is pending, apply it while on airport Wi-Fi before pushback.
3. Record the effective cycle in the trip brief notes.
4. If the update cannot complete before departure, notify Scheduling and carry current paper backups.

## Responsibility
The PIC is responsible for chart currency; either pilot may perform the verification.`;

const GOM3_CONTENT = `# General Operations Manual — Chapter 3: Flight Operations

## 3.1 Operational Control
The Director of Operations exercises operational control. Trip assignment and release authority flow through Scheduling.

## 3.2 Crew Qualification & Currency
Crewmembers must hold the certificates, ratings, and currency items listed in Chapter 5 before assignment.

## 3.3 Flight Planning
Every company flight requires a filed flight plan, weather brief, NOTAM review, and performance calculation appropriate to the runway and conditions.

## 3.4 Weather Minimums
Company minimums are published in the Ops Specs appendix; where more conservative than regulatory minimums, company minimums govern.

## 3.5 Fuel Policy
Plan destination + alternate (when required) + 45 minutes reserve at normal cruise. The PIC may increase fuel at their discretion; Scheduling coordinates uplift.

## 3.6 International Operations
See Chapter 9 for ICAO procedures, customs (eAPIS), and overflight permits.`;

const TK1_CONTENT = `# KTEB ramp construction: which FBO gates actually work

While the primary FBO ramp is under construction (see FOB-002), the published gate guidance is wrong on the field diagram apps.

**What actually works:**
- Arrivals after 2100L: north gate only — the west gate card readers are dead after hours.
- Ground transport staging is at the **north gate**, not the terminal front.
- Fuel trucks stage from the alternate FBO — order fuel at least 45 min before pushback or you'll wait behind the NetJets bank.
- The alternate FBO's coffee is on the second floor. You're welcome.

Verified with FBO ops 2x this month. Will re-check when the primary ramp reopens.`;

const TK2_CONTENT = `# G650 APU cold-soak starts — field notes

After an overnight cold-soak below −15°C, the APU can hang between 35–45% N on the first start of the day.

**What the fleet has learned:**
- Let the start attempt continue — do NOT abort early unless EGT trends toward the limit; a hung start that recovers by 50% is normal in deep cold.
- If it does abort, wait the full cooldown, then the second attempt is almost always clean.
- Log every hung start in the tech log with OAT — Maintenance is tracking a possible fuel-control trend with Gulfstream.
- GPU-assisted starts mask the symptom; note on the work order if a GPU was used.`;

const SMS_CONTENT = `# SMS Manual — Revision G

## Purpose
The Safety Management System (SMS) manual defines how the department identifies hazards, reports safety concerns, and manages operational risk across flight, cabin, and maintenance operations.

## §4.3 Fatigue Reporting (revised)
Any crew member who is too fatigued to safely perform a duty period must file a fatigue report before that period. Reports route directly to the Safety Manager and carry no penalty — the company's just-culture policy fully supports the call.

## Appendix C — De-Ice Hold-Over Table (replaced)
The hold-over time table has been replaced in full this revision. Discard any printed copy of the previous table and use only the Rev G table when determining hold-over limits.

## Acknowledgement
All crew must read and initial Revision G before their next duty period.`;

// ── SOP-001: two revisions — r1 superseded, r2 published (signature-level ack) ──
const sop1r1: DocRevision = {
  id: 'SOP-001-r1',
  docId: 'SOP-001',
  revision: '1.0',
  status: 'superseded',
  sections: sectionsFromMarkdown(SOP1_R1_CONTENT, 'SOP-001'),
  changeSummary: '',
  effectiveDate: '2025-03-01',
  authorUserId: 'USR007',
  authorName: 'First Officer Emily Chen',
  requireAcknowledgment: true,
  ackLevel: 'signature',
  mockChecksum: checksumForSections(sectionsFromMarkdown(SOP1_R1_CONTENT, 'SOP-001')),
  publishedAtUtc: '2025-03-01T00:00:00.000Z',
};

const sop1r2: DocRevision = {
  id: 'SOP-001-r2',
  docId: 'SOP-001',
  revision: '2.0',
  status: 'published',
  sections: applyComplianceRefs(sectionsFromMarkdown(SOP1_R2_CONTENT, 'SOP-001'), {
    'Criteria (all must be met)': ['far-91-175', 'opspec-c074'],
    'Go-Around Callout (standardized)': ['far-91-175'],
  }),
  changeSummary:
    'Stabilized-approach gate raised from 500 ft to 1,000 ft AFE for circling approaches; go-around callout standardized ("GO AROUND", immediate execution).',
  effectiveDate: daysFromNow(-3),
  authorUserId: 'USR007',
  authorName: 'First Officer Emily Chen',
  requireAcknowledgment: true,
  ackLevel: 'signature',
  ackDueDate: daysFromNow(7),
  mockChecksum: checksumForSections(sectionsFromMarkdown(SOP1_R2_CONTENT, 'SOP-001')),
  submittedAtUtc: daysFromNow(-5) + 'T14:00:00.000Z',
  decidedAtUtc: daysFromNow(-4) + 'T09:30:00.000Z',
  decidedByUserId: 'role:document-manager',
  decidedByName: 'Document Manager',
  publishedAtUtc: daysFromNow(-3) + 'T12:00:00.000Z',
};

// ── SOP-002: pending approval (pays off FOB-001's "will be folded into the FOM") ──
const sop2r1: DocRevision = {
  id: 'SOP-002-r1',
  docId: 'SOP-002',
  revision: '1.0',
  status: 'pending-approval',
  sections: sectionsFromMarkdown(SOP2_CONTENT, 'SOP-002'),
  changeSummary: '',
  effectiveDate: daysFromNow(14),
  authorUserId: 'role:procedural-specialist',
  authorName: 'Procedural Specialist Alvarez',
  requireAcknowledgment: true,
  ackLevel: 'signature',
  ackDueDate: daysFromNow(21),
  mockChecksum: checksumForSections(sectionsFromMarkdown(SOP2_CONTENT, 'SOP-002')),
  submittedAtUtc: daysFromNow(-1) + 'T16:20:00.000Z',
};

/**
 * SOP-003 — D64's controlled procedure, fleet-scoped so the tail page can link to it.
 *
 * NO REGULATORY CITATION APPEARS HERE, deliberately. Navigation-database currency very likely has
 * a regulatory hook, but no primary source has been read for it, and this project does not guess a
 * citation into an SOP. Add one only behind an `authoritative` reference note.
 */
const SOP3_CONTENT = `## Charts and navigation database load — G650ER

**Demonstration content.** Steps and effectivity are illustrative, not an approved procedure.

[!STEP] Confirm the aircraft is on ground power and the avionics are in maintenance mode.

[!STEP] Verify the cycle you are about to load is the one currently effective, not the next one.

> [!CAUTION]
> Loading the wrong cycle is not obvious afterwards — the box reports success either way.

[!STEP] Insert the loader and follow the on-screen prompts to completion.

[!STEP] Record the loaded cycle and confirm it reads back correctly on both sides.`;

const sop3r1: DocRevision = {
  id: 'SOP-003-r1',
  docId: 'SOP-003',
  revision: '1.0',
  status: 'published',
  sections: sectionsFromMarkdown(SOP3_CONTENT, 'SOP-003'),
  changeSummary: '',
  effectiveDate: daysFromNow(-7),
  authorUserId: 'role:procedural-specialist',
  authorName: 'Procedural Specialist Alvarez',
  requireAcknowledgment: false,
  ackLevel: 'none',
  mockChecksum: checksumForSections(sectionsFromMarkdown(SOP3_CONTENT, 'SOP-003')),
  publishedAtUtc: daysFromNow(-7) + 'T12:00:00.000Z',
  decidedAtUtc: daysFromNow(-7) + 'T11:00:00.000Z',
  decidedByUserId: 'USR002',
  decidedByName: 'Sarah Wilson',
  // D64 — fleetScoped on the `sop` class, so this reaches the G650ER tail pages.
  fleetTypes: ['G650ER'],
};

// ── GOM-3: published rev 12, initials-level, ack window OVERDUE, review OVERDUE ──
const gom3r1: DocRevision = {
  id: 'GOM-3-r1',
  docId: 'GOM-3',
  revision: '12.0',
  status: 'published',
  sections: applyComplianceRefs(sectionsFromMarkdown(GOM3_CONTENT, 'GOM-3'), {
    'Operational Control': ['far-91-403', 'opspec-a010'],
    'Crew Qualification & Currency': ['far-91-409'],
    'Weather Minimums': ['far-91-175'],
  }),
  changeSummary: 'Fuel policy (§3.5) aligned with the new 45-minute reserve wording; international ops cross-references updated.',
  effectiveDate: daysFromNow(-30),
  authorUserId: 'role:document-manager',
  authorName: 'Document Manager',
  requireAcknowledgment: true,
  ackLevel: 'initials',
  ackDueDate: daysFromNow(-2),
  mockChecksum: checksumForSections(sectionsFromMarkdown(GOM3_CONTENT, 'GOM-3')),
  publishedAtUtc: daysFromNow(-30) + 'T12:00:00.000Z',
};

// ── SMS Manual Rev G: published, initials-level, crew-wide required read (TL-6 / D29).
//    'manual' class → /documents reader route → DocReader/AckPanel (the verified ack path). ──
const gomSmsR1: DocRevision = {
  id: 'GOM-SMS-r1',
  docId: 'GOM-SMS',
  revision: 'G',
  status: 'published',
  sections: sectionsFromMarkdown(SMS_CONTENT, 'GOM-SMS'),
  changeSummary: 'Rev G: fatigue-reporting flow (§4.3) updated; de-ice hold-over table replaced (Appendix C).',
  effectiveDate: daysFromNow(-4),
  authorUserId: 'role:document-manager',
  authorName: 'Document Manager',
  requireAcknowledgment: true,
  ackLevel: 'initials',
  ackDueDate: daysFromNow(3),
  mockChecksum: checksumForSections(sectionsFromMarkdown(SMS_CONTENT, 'GOM-SMS')),
  publishedAtUtc: daysFromNow(-4) + 'T12:00:00.000Z',
};

const gomSmsDoc: Doc = {
  id: 'GOM-SMS',
  classId: 'manual',
  title: 'SMS Manual — Revision G',
  category: 'General Operations',
  roles: ['pilot', 'inflight', 'maintenance', 'lead', 'admin'],
  ownerUserId: 'role:document-manager',
  ownerName: 'Document Manager',
  tags: ['sms', 'safety', 'manual'],
  isPinned: false,
  isArchived: false,
  reviewCycleDays: 365,
  nextReviewDate: daysFromNow(300),
  createdDate: '2024-01-15',
};

/** The safety-specific required read (TL-6 / D29). Exported so the store
 * migration can inject it into stores created before it was seeded — new seed
 * content otherwise reaches only a fresh install (loadInitialState spreads a
 * persisted state over the seeds). */
export function safetyReadSeed(): { doc: Doc; rev: DocRevision } {
  return { doc: gomSmsDoc, rev: gomSmsR1 };
}

// ── Tribal knowledge (curator direct-published, no ack requirement) ──
const tk1r1: DocRevision = {
  id: 'TK-001-r1',
  docId: 'TK-001',
  revision: '1.0',
  status: 'published',
  sections: sectionsFromMarkdown(TK1_CONTENT, 'TK-001'),
  changeSummary: '',
  effectiveDate: daysFromNow(-12),
  authorUserId: 'role:scheduling-manager',
  authorName: 'Scheduling Manager Reyes',
  requireAcknowledgment: false,
  ackLevel: 'none',
  mockChecksum: checksumForSections(sectionsFromMarkdown(TK1_CONTENT, 'TK-001')),
  publishedAtUtc: daysFromNow(-12) + 'T12:00:00.000Z',
  // Sidecar media carried alongside the block body (as a migrated bulletin would carry it).
  images: [
    {
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="260" height="80"><rect width="260" height="80" fill="%23e2e8f0"/><text x="130" y="46" font-family="sans-serif" font-size="14" text-anchor="middle" fill="%23334155">Duty-time worksheet</text></svg>',
      caption: 'Figure 1 — duty/rest worksheet.',
    },
  ],
  links: [
    { url: 'https://my.gulfstream.com', title: 'G650ER duty-rest reference (myGulfstream online pubs)' },
  ],
};

/**
 * D60 fix pass — the fleet applicability of the pre-D60 tribal-knowledge entry `TK-002`
 * ("G650 APU cold-soak starts"). Exported so the back-fill migration for stores created before
 * this fix reads the same value the seed does, rather than restating it.
 *
 * Declared here rather than beside the CAS seeds below because `tk2r1` (immediately after this)
 * reads it at module-init time; a `const` used before its declaration is a TDZ ReferenceError.
 */
export const TK_002_FLEET_TYPES: AircraftType[] = ['G650ER'];

const tk2r1: DocRevision = {
  id: 'TK-002-r1',
  docId: 'TK-002',
  revision: '1.0',
  status: 'published',
  sections: sectionsFromMarkdown(TK2_CONTENT, 'TK-002'),
  changeSummary: '',
  effectiveDate: daysFromNow(-220),
  authorUserId: 'USR002',
  authorName: 'Sarah Wilson',
  requireAcknowledgment: false,
  ackLevel: 'none',
  mockChecksum: checksumForSections(sectionsFromMarkdown(TK2_CONTENT, 'TK-002')),
  publishedAtUtc: daysFromNow(-220) + 'T12:00:00.000Z',
  // D60 fix pass — this entry predates the `fleetTypes` axis and is plainly G650-specific, so
  // without the tag it was invisible on the very Reference tab built to surface fleet knowledge.
  // The canonical string is 'G650ER'; 'G650' is display shorthand and not an `AircraftType`.
  // D65 moved the tag from the doc row onto this, its published revision.
  fleetTypes: TK_002_FLEET_TYPES,
};

// ── D60: per-fleet CAS tribal knowledge (curator direct-published, reference only) ──
//
// Obviously-demo content. The CAS messages deliberately match the ones the tech-log seeds put on
// defects (GEAR UNSAFE / R ENG CHIP on the G650ER, GPS 1 ADVISORY on the G500, CABIN TEMP on both),
// because the feature is only demonstrable if the picker can offer the message a demo defect
// carries and the "what maintenance knows" deep link therefore resolves. Colours match the seeded
// defects' colours for the same reason — a catalog that disagreed with the record would be teaching
// the wrong tier. `casKnowledgeSeeds.test.ts` pins those PROPERTIES rather than these strings.
//
// The G800 entries exist because N3PG is in the fleet seed (provisional) and its Reference tab must
// not be empty; the CAS one is tied to the drafted G800 brake-temperature MEL item.

/** Shared closing section: config values are LINKED, never restated (D60). */
const CONFIG_POINTER = `
## Related configuration — do not restate numbers here
Per-tail configuration lives on the aircraft record (Tech Log → Admin → Fleet). The standby fuel
target (\`Aircraft.standbyFuelLoadLb\`) is one of those values: the postflight **Fuel load** step
shows the figure for the tail you are working, and it is deliberately not repeated in this article.
There is one source of truth for it and this is not it. (That field ships today as fleet record data
with no editor of its own — so read it off the tail, never off a note.)`;

interface CasSeed {
  id: string;
  title: string;
  fleetTypes: AircraftType[];
  /** D64 — audience decides which section EXPANDS first for this reader; it never hides a section.
   *  Defaults to everyone, which is right for shared knowledge like a CAS meaning. */
  roles?: string[];
  casMeta?: { casMessage: string; casColor: CasColor; cmcCodes?: string[] };
  category: string;
  body: string;
  ageDays: number;
}

/**
 * THE `TK-9xx` RANGE IS RESERVED FOR SEEDS, and this is not cosmetic.
 *
 * These entries shipped as `TK-003`…`TK-010`. `nextDocId` (engine/revisions) allocates
 * max-suffix + 1, and the pre-slice tribal-knowledge seeds stop at `TK-002` — so `TK-003` is
 * precisely the id the FIRST curator-created entry got, and creating one was reachable before this
 * slice. The forward migration adds a seed only when its id is ABSENT, so on a returning store where
 * a curator had written one entry, seed `TK-003` was silently dropped: the seeded N1PG defect
 * carrying GEAR UNSAFE then resolved no catalog entry and the "what maintenance knows" deep link
 * never appeared. Two prior entries swallowed `TK-004` as well, and so on down the list.
 *
 * Seeds now live above anything the allocator will hand out for a very long time. The visible
 * consequence is that `nextDocId` returns `TK-909` for the next curator entry on a seeded store,
 * which is the correct trade: a demo id that looks high beats seeded knowledge that vanishes.
 * `casKnowledgeSeeds.test.ts` runs the migration against a store already holding a curator-authored
 * `TK-003` and asserts every seed still lands.
 */
const CAS_SEEDS: CasSeed[] = [
  {
    id: 'TK-901',
    title: 'GEAR UNSAFE — the intermittent squat-switch case (DEMO)',
    fleetTypes: ['G650ER'],
    casMeta: { casMessage: 'GEAR UNSAFE', casColor: 'AMBER', cmcCodes: ['32-31-14'] },
    category: 'Messages & faults',
    roles: ['pilot', 'chief-pilot', 'maintenance', 'dom', 'lead'],
    ageDays: 60,
    body: `# GEAR UNSAFE — the intermittent squat-switch case (DEMO)

**Demonstration content.** Field notes, not procedure — the AMM and the MEL govern.

**What the fleet has seen.** An amber GEAR UNSAFE that appears during retraction and clears on a
recycle has, on this fleet, more often been a proximity/squat-switch rigging symptom than a gear
problem. It has also been genuine. Never assume the benign case from the annunciation alone.

**What to record.** Whether it cleared on the recycle, at what point in the retraction it lit, and
the CMC code as read off the page — that is what maintenance starts from.

**What this note is not.** It is not a dispatch decision. An open airworthiness defect grounds the
aircraft until maintenance defers or rectifies it.`,
  },
  {
    id: 'TK-902',
    title: 'R ENG CHIP — treat as an engine event until proven otherwise (DEMO)',
    fleetTypes: ['G650ER'],
    casMeta: { casMessage: 'R ENG CHIP', casColor: 'RED', cmcCodes: ['79-3100-02'] },
    category: 'Messages & faults',
    roles: ['pilot', 'chief-pilot', 'maintenance', 'dom', 'lead'],
    ageDays: 45,
    body: `# R ENG CHIP — treat as an engine event until proven otherwise (DEMO)

**Demonstration content.** Field notes, not procedure.

A red CHIP annunciation is not a nuisance category on this fleet. It has driven an AOG and a
borescope. Land, log it, and expect the chip detector to be pulled and inspected.

**Why it is here.** So that "has anyone seen this before" has an answer that is not a group chat.
The safety report and the tech-log entry are still the records; this is context.`,
  },
  {
    id: 'TK-903',
    title: 'CABIN TEMP — zone controller drift on both fleets (DEMO)',
    fleetTypes: ['G650ER', 'G500'],
    casMeta: { casMessage: 'CABIN TEMP', casColor: 'CYAN' },
    category: 'Cabin & connectivity',
    ageDays: 30,
    body: `# CABIN TEMP — zone controller drift on both fleets (DEMO)

**Demonstration content**, and deliberately tagged for BOTH types — the same advisory behaves the
same way on the 650 and the 500, and an entry that applies to two fleets should say so rather than
be written twice.

A cyan CABIN TEMP after a long cold soak has usually been zone-sensor calibration drift. It is an
advisory, not a dispatch item, but it is worth a squawk if the cabin cannot hold a selected
temperature — that is what gets the sensor recalibrated instead of re-reported every leg.`,
  },
  {
    id: 'TK-904',
    title: 'GPS 1 ADVISORY — known nuisance window (DEMO)',
    fleetTypes: ['G500'],
    casMeta: { casMessage: 'GPS 1 ADVISORY', casColor: 'WHITE' },
    category: 'Messages & faults',
    roles: ['pilot', 'chief-pilot', 'maintenance', 'dom', 'lead'],
    ageDays: 20,
    body: `# GPS 1 ADVISORY — known nuisance window (DEMO)

**Demonstration content.** Field notes, not procedure.

A white GPS 1 advisory that self-clears within a minute or two has been seen during receiver
reacquisition. It has also preceded a genuine antenna-coax failure that needed the antenna replaced,
so a repeat on the same tail is worth a squawk rather than a shrug.

Record how long it stood and whether position was lost — the repeat-defect detector needs those two
facts to be worth anything.`,
  },
  {
    id: 'TK-905',
    title: 'BRK TEMP HIGH — G800 onboarding note (DEMO)',
    fleetTypes: ['G800'],
    casMeta: { casMessage: 'BRK TEMP HIGH', casColor: 'AMBER' },
    category: 'Messages & faults',
    roles: ['pilot', 'chief-pilot', 'maintenance', 'dom', 'lead'],
    ageDays: 10,
    body: `# BRK TEMP HIGH — G800 onboarding note (DEMO)

**Demonstration content**, and the fleet has no G800 experience yet — which is the point of the
entry existing at all.

The type's brake-temperature monitoring is a drafted MEL item pending FSDO approval, so it cannot be
deferred against yet. Until the type's D195 is approved, a brake-temperature annunciation on the
provisional tail is a maintenance conversation, not a deferral.

Add what you learn as the type comes online. An empty fleet reference is how tribal knowledge ends up
in a group chat instead.`,
  },
  {
    id: 'TK-906',
    title: 'Normal startup CAS stack — G650ER (DEMO)',
    fleetTypes: ['G650ER'],
    category: 'Messages & faults',
    roles: ['pilot', 'chief-pilot', 'maintenance', 'dom', 'lead'],
    ageDays: 50,
    body: `# Normal startup CAS stack — G650ER (DEMO)

**Demonstration content.** What the crew normally sees on the ground before the first start, so that
what is NOT normal stands out. A freeform article: no single CAS message owns it, which is why it
carries no structured CAS metadata.

The typical ground stack clears progressively as systems come up. Worth a second look:
- anything amber or red still standing after the second engine start;
- an advisory that has never appeared on this tail before;
- anything the last crew's postflight note also mentions.
${CONFIG_POINTER}`,
  },
  {
    id: 'TK-907',
    title: 'Normal startup CAS stack — G500 (DEMO)',
    fleetTypes: ['G500'],
    category: 'Messages & faults',
    ageDays: 40,
    body: `# Normal startup CAS stack — G500 (DEMO)

**Demonstration content**, the G500 counterpart to the 650 note — the stacks differ enough that one
shared article would teach the wrong thing on one of the two fleets.

Same rule: know the normal stack, so the abnormal one is obvious. Anything still standing after the
second start belongs in the tech log, not in the next crew's memory.
${CONFIG_POINTER}`,
  },
  {
    id: 'TK-908',
    title: 'Normal startup CAS stack — G800 (DEMO)',
    fleetTypes: ['G800'],
    category: 'Messages & faults',
    ageDays: 8,
    body: `# Normal startup CAS stack — G800 (DEMO)

**Demonstration content**, and mostly a placeholder: the G800 is in onboarding (the fleet's G800 tail
is provisional) and nobody has flown it enough to know its normal stack.

Fill this in as the type comes online, rather than starting a new note somewhere else.
${CONFIG_POINTER}`,
  },
  {
    // D64 — Bryan's own example of the step-card shape: "how to reset the wifi. Would be many
    // steps with pictures of each step."
    id: 'TK-909',
    title: 'Reset the cabin wifi (DEMO)',
    fleetTypes: ['G650ER', 'G500'],
    roles: ['inflight', 'inflight-manager', 'commissary'],
    category: 'Cabin & connectivity',
    ageDays: 5,
    body: `## Reset the cabin wifi (DEMO)

[!STEP] Open the aft left cabinet and locate the CMS router panel.
![CMS router panel](https://placehold.co/480x200?text=CMS+router+panel)

[!STEP] Note the current SSID on the label before you change anything.

[!STEP] Hold the reset pin for 10 seconds, until the amber light blinks twice.
![reset pin location](https://placehold.co/480x200?text=reset+pin)

> [!CAUTION]
> A shorter press reboots the router without clearing the stored password. It looks like it worked
> and it did not.

[!STEP] Wait for the amber light to go steady green — about ninety seconds.

[!STEP] Rejoin from a phone to confirm, then write the new password on the galley card.`,
  },
  {
    // D64 — Bryan's second example: "Or how to set up a bed. Same thing."
    id: 'TK-910',
    title: 'Set up the divan bed (DEMO)',
    fleetTypes: ['G650ER'],
    roles: ['inflight', 'inflight-manager'],
    category: 'Cabin & connectivity',
    ageDays: 5,
    body: `## Set up the divan bed (DEMO)

[!STEP] Clear the divan and stow the cushions in the aft closet.
![divan, cleared](https://placehold.co/480x200?text=divan+cleared)

[!STEP] Release the two seat-back catches — they are behind the piping, not under it.

[!STEP] Lower the seat back until it sits flush with the base.

> [!NOTE]
> If it will not sit flush, a belt buckle is usually trapped underneath. Do not force it.

[!STEP] Fit the mattress pad, seam to the window side.

[!STEP] Make up the bed and set the reading lights to the dim preset.`,
  },
];

function casSeedDoc(s: CasSeed): Doc {
  return {
    id: s.id,
    classId: 'tribal-knowledge',
    title: s.title,
    category: s.category,
    roles: s.roles ?? ['all'],
    ownerUserId: 'USR002',
    ownerName: 'Sarah Wilson',
    tags: ['cas', 'demo', ...s.fleetTypes.map((t) => t.toLowerCase())],
    isPinned: false,
    isArchived: false,
    reviewCycleDays: 180,
    nextReviewDate: daysFromNow(180 - s.ageDays),
    createdDate: daysFromNow(-s.ageDays),
  };
}

function casSeedRevision(s: CasSeed): DocRevision {
  const sections = sectionsFromMarkdown(s.body, s.id);
  return {
    id: `${s.id}-r1`,
    docId: s.id,
    revision: '1.0',
    status: 'published',
    sections,
    changeSummary: '',
    effectiveDate: daysFromNow(-s.ageDays),
    authorUserId: 'USR002',
    authorName: 'Sarah Wilson',
    requireAcknowledgment: false,
    ackLevel: 'none',
    mockChecksum: checksumForSections(sections),
    publishedAtUtc: daysFromNow(-s.ageDays) + 'T12:00:00.000Z',
    // D65 — the CAS facts ride the publishable unit, so a seeded entry is offerable
    // for exactly as long as this revision is the published one.
    fleetTypes: s.fleetTypes,
    casMeta: s.casMeta,
  };
}

/**
 * D60 CAS knowledge seeds. Exported so the store migration can inject them into stores created
 * before this slice — new seed content otherwise reaches only a fresh install, because
 * `loadInitialState` spreads the persisted state over the seeds. Same mechanism as
 * {@link safetyReadSeed}.
 */
/**
 * D64 — a DEMO subset of maintenance's known-nuisance CMC list.
 *
 * **Deliberately not the real list.** The scanned source points at the GVII family (G500/G600) via
 * `C_GAC_GVII_PAR_3391` and a note reading "G600 fix to be applied to G500 in Block 1", but that
 * applicability is UNCONFIRMED (`ref-gvii-known-nuisance-messages`), and D64 forbids seeding
 * against a fleet type until the maintenance team rules. So: twelve representative rows spanning
 * the real ATA chapters, marked DEMO, including one `superseded` and one `being-worked` so both
 * states render.
 *
 * These are CMC MAINTENANCE messages, not CAS annunciations — see `DocCmcRow`.
 */
const NUISANCE_ROWS_G500: DocCmcRow[] = [
  { messageName: 'COM1-NIM MAC BUS WIRING FAULT', maintCode: '2302031COM1', ataChapter: '23', vendorRefs: ['PR015033'], vendorStatus: 'accepted' },
  { messageName: 'SATC-TSC2 TO SDU BUS FAULT', maintCode: '2315011SATC', ataChapter: '23', vendorRefs: ['PR015034'], vendorStatus: 'accepted' },
  { messageName: 'SATC-ETHERNET 1 TO SDU BUS FAULT', maintCode: '2315023SATC', ataChapter: '23', vendorRefs: ['PR015034'], vendorStatus: 'accepted' },
  { messageName: 'SPR1-PWS VALVE 5 FAULT', maintCode: '2480117SPR1', ataChapter: '38', vendorRefs: ['PR014109'], vendorStatus: 'superseded', supersededNote: 'PR015035 is closed, see PR014109' },
  { messageName: 'DG1-XM WX ANTENNA FAILED', maintCode: '31619521DG1', ataChapter: '31', vendorRefs: ['PR015036'], vendorStatus: 'accepted' },
  { messageName: 'DG2-XM WX DATA CORRUPTION', maintCode: '31619522DG2', ataChapter: '31', vendorRefs: ['PR015036'], vendorStatus: 'accepted' },
  { messageName: 'BCSI-INBD ABS WOW DISAGREE FAULT', maintCode: '3244335BCSI', ataChapter: '32', vendorRefs: [], vendorStatus: 'accepted' },
  { messageName: 'SFD1-NO OR INVALID NAVC DATA', maintCode: '3427012SFD1', ataChapter: '34', vendorRefs: ['PR011020', 'PR012999'], vendorStatus: 'accepted' },
  { messageName: 'EGP1-FLT HISTORY WRITE FAULT/DBM', maintCode: '3446024EGP1', ataChapter: '34', vendorRefs: ['Jira 3243'], vendorStatus: 'being-worked' },
  { messageName: 'FMS1-AGM2[GGF2]/FMS1/WRG FAULT', maintCode: '3461052FMS1', ataChapter: '34', vendorRefs: ['Jira 3242', 'C_GAC_GVII_PAR_3391'], vendorStatus: 'being-worked' },
  { messageName: 'SW2-ESC 2A WIRING FAULT', maintCode: '42330013SW2', ataChapter: '42', vendorRefs: ['PR010595'], vendorStatus: 'accepted' },
  { messageName: 'CMC-ARCHIVE TRANSFER FAULT', maintCode: '45451003CMC', ataChapter: '45', vendorRefs: ['PR015038'], vendorStatus: 'accepted' },
];

const NUISANCE_DOC_ID = 'TK-911';

function nuisanceListSeed(): { doc: Doc; rev: DocRevision } {
  const body = `## Known nuisance messages — G500 (DEMO)

Messages maintenance already knows about and is tracking with the vendor. **Information, not a
decision:** a message appearing here does not mean it should go unreported. Raise a defect exactly
as you normally would, and say that you saw it.

Applicability is still being confirmed with maintenance — treat the fleet tag as provisional.`;
  const sections = sectionsFromMarkdown(body, NUISANCE_DOC_ID);
  return {
    doc: {
      id: NUISANCE_DOC_ID,
      classId: 'tribal-knowledge',
      title: 'Known nuisance messages — G500 (DEMO)',
      category: 'Messages & faults',
      // Crew read these off the TOD report and maintenance curates them, so both — but not cabin.
      roles: ['maintenance', 'pilot', 'chief-pilot', 'dom'],
      ownerUserId: 'USR002',
      ownerName: 'Sarah Wilson',
      tags: ['cmc', 'nuisance', 'demo', 'g500'],
      isPinned: false,
      isArchived: false,
      reviewCycleDays: 180,
      nextReviewDate: daysFromNow(174),
      createdDate: daysFromNow(-6),
    },
    rev: {
      id: `${NUISANCE_DOC_ID}-r1`,
      docId: NUISANCE_DOC_ID,
      revision: '1.0',
      status: 'published',
      sections,
      changeSummary: '',
      effectiveDate: daysFromNow(-6),
      authorUserId: 'USR002',
      authorName: 'Sarah Wilson',
      requireAcknowledgment: false,
      ackLevel: 'none',
      mockChecksum: checksumForSections(sections),
      publishedAtUtc: daysFromNow(-6) + 'T12:00:00.000Z',
      fleetTypes: ['G500'],
      cmcRows: NUISANCE_ROWS_G500,
    },
  };
}

export function casKnowledgeSeed(): { docs: Doc[]; revisions: DocRevision[] } {
  const nuisance = nuisanceListSeed();
  return {
    docs: [...CAS_SEEDS.map(casSeedDoc), nuisance.doc],
    revisions: [...CAS_SEEDS.map(casSeedRevision), nuisance.rev],
  };
}


// ── D75: cabin knowledge (FA-authored, FA-manager approved, per fleet type) ──
//
// Built through `stepFormToSections` rather than hand-written markdown ON PURPOSE: the seed then
// exercises the same serializer the form uses, so a demo entry cannot be shaped in a way the form
// could never have produced. The three below are the examples Bryan named — bedding, cabin
// lighting, cabin wifi — one per fleet type so the shelf's fleet filter has something to filter.
interface CabinSeed {
  id: string;
  title: string;
  category: string;
  fleetTypes: AircraftType[];
  tags: string[];
  model: StepFormModel;
  video?: string;
  ageDays: number;
}

const CABIN_SEEDS: CabinSeed[] = [
  {
    id: 'CK-001',
    title: 'Aft divan bedding — G650ER',
    category: 'Bedding & crew rest',
    fleetTypes: ['G650ER'],
    tags: ['bedding', 'divan', 'turndown'],
    ageDays: -34,
    video: 'https://vimeo.com/gfo-cabin/divan-bedding-g650er',
    model: {
      steps: [
        { key: 's1', text: 'Recline the divan fully and move the seat-back cushions to the forward closet.' },
        { key: 's2', text: 'Fit the aft corners of the fitted sheet first — the forward corners tuck under the belt-buckle housing and will not seat if you start forward.' },
        { key: 's3', text: 'Lay the duvet with the label end aft, then fold the top third back on itself.' },
        { key: 's4', text: 'Two pillows aft, standing on edge against the bulkhead; the third lies flat as a back rest.' },
      ],
      caution: 'Do not stow the seat-back cushions in the aft baggage compartment — that space is placarded for the crew rest kit.',
    },
  },
  {
    id: 'CK-002',
    title: 'Resetting cabin lighting after a scene freeze — G500',
    category: 'Cabin systems & lighting',
    fleetTypes: ['G500'],
    tags: ['lighting', 'cms', 'reset'],
    ageDays: -20,
    model: {
      steps: [
        { key: 's1', text: 'Confirm the scene is genuinely frozen: change the zone brightness from a second touchscreen before resetting anything.' },
        { key: 's2', text: 'Hold the cabin-light master on the forward galley panel for five seconds until the strip blinks twice.' },
        { key: 's3', text: 'Wait a full thirty seconds. The zones come back one at a time, aft to forward — a zone still dark at twenty seconds is not a failure yet.' },
        { key: 's4', text: 'Re-select the scene you wanted. Presets survive the reset; a manually dimmed zone does not.' },
      ],
      caution: 'Never cycle the master with passengers seated aft in darkness — brief them first, or wait for a cabin-service break.',
    },
  },
  {
    id: 'CK-003',
    title: 'Cabin wifi is up but nothing loads — what to try before calling it a defect',
    category: 'Connectivity & entertainment',
    fleetTypes: ['G650ER', 'G500'],
    tags: ['wifi', 'connectivity', 'satcom'],
    ageDays: -8,
    model: {
      steps: [
        { key: 's1', text: 'Check the router status page from the cabin tablet before touching anything — if it reports no space segment, this is coverage, not a fault, and no reset will help.' },
        { key: 's2', text: 'Ask one passenger to forget the network and rejoin. A single device holding a stale lease looks exactly like an aircraft-wide outage.' },
        { key: 's3', text: 'If two or more devices fail the same way, cycle the cabin router from the galley panel and allow four minutes for reacquisition.' },
        { key: 's4', text: 'Still down after the cycle: write it up. Note the time, the region, and whether the status page saw a space segment — that is what maintenance needs.' },
      ],
      caution: '',
    },
  },
];

const cabinSeedDoc = (seed: CabinSeed): Doc => ({
  id: seed.id,
  classId: 'cabin-knowledge',
  title: seed.title,
  category: seed.category,
  roles: ['inflight', 'lead-fa', 'fa-manager', 'pilot'],
  ownerUserId: 'role:fa-manager',
  ownerName: 'Cabin Services Manager Hart',
  tags: seed.tags,
  isPinned: false,
  isArchived: false,
  reviewCycleDays: 365,
  nextReviewDate: daysFromNow(365 + seed.ageDays),
  createdDate: daysFromNow(seed.ageDays),
});

const cabinSeedRevision = (seed: CabinSeed): DocRevision => {
  const sections = stepFormToSections(seed.model, seed.id);
  return {
    id: `${seed.id}-r1`,
    docId: seed.id,
    revision: '1.0',
    status: 'published',
    sections,
    changeSummary: '',
    effectiveDate: daysFromNow(seed.ageDays),
    authorUserId: 'role:lead-fa',
    authorName: 'Lead FA Moreau',
    requireAcknowledgment: false,
    ackLevel: 'none',
    mockChecksum: checksumForSections(sections),
    submittedAtUtc: daysFromNow(seed.ageDays - 1) + 'T15:00:00.000Z',
    // Four-eyes: drafted by the lead FA, published by the cabin services manager (D75).
    decidedAtUtc: daysFromNow(seed.ageDays) + 'T11:00:00.000Z',
    decidedByUserId: 'role:fa-manager',
    decidedByName: 'Cabin Services Manager Hart',
    publishedAtUtc: daysFromNow(seed.ageDays) + 'T12:00:00.000Z',
    fleetTypes: seed.fleetTypes,
    videos: seed.video ? [{ url: seed.video, title: seed.title }] : undefined,
  };
};

/** D75 — exported so the stored-state migration brings an EXISTING demo store forward to the
 *  cabin shelf. Without this the three entries reach only a fresh install, and anyone whose
 *  browser already holds a documents store opens Cabin knowledge to an empty shelf. */
export function cabinKnowledgeSeed(): { docs: Doc[]; revisions: DocRevision[] } {
  return { docs: CABIN_SEEDS.map(cabinSeedDoc), revisions: CABIN_SEEDS.map(cabinSeedRevision) };
}

/**
 * D73 seeds — the two ways myGFO holds a document it did not author, so the
 * distinction is visible in the demo rather than described in a doc.
 *
 * RCV-001 is the ingest branch: the D195 MEL, held as bytes because it must be
 * producible onboard. RCV-002 is the pointer branch: an OEM catalogue nobody
 * signs and nobody carries, so myGFO stores a link and says plainly that it is
 * not available offline.
 *
 * RCV-001 ships with REAL bytes and their TRUE digest (store/demoSeedBlob,
 * pinned by its test). A seeded hash that backed no file would be exactly the
 * failure this feature must not have — a digest labelled "computed by myGFO"
 * with nothing behind it.
 */
const melAttachment = {
  blobKey: MEL_DEMO_BLOB_KEY,
  filename: MEL_DEMO_FILENAME,
  mimeType: 'application/pdf',
  byteLength: MEL_DEMO_BYTE_LENGTH,
  sha256: MEL_DEMO_SHA256,
};

const melProvenance = {
  origin: 'received-copy' as const,
  attachment: melAttachment,
  ingestedAtUtc: daysFromNow(-24) + 'T14:10:00.000Z',
  ingestedByUserId: 'USR005',
  ingestedByName: 'Lisa Anderson',
  sourceLabel: 'P&G SharePoint — Flight Ops / MEL',
  carriageReason: 'required-onboard' as const,
};

const rcv1Sections = receivedPlaceholderSections('RCV-001', melAttachment, melProvenance);

const rcv1r1: DocRevision = {
  id: 'RCV-001-r1',
  docId: 'RCV-001',
  revision: '15',
  status: 'published',
  sections: rcv1Sections,
  changeSummary: '',
  effectiveDate: daysFromNow(-24),
  authorUserId: 'USR005',
  authorName: 'Lisa Anderson',
  requireAcknowledgment: true,
  ackLevel: 'initials',
  ackDueDate: daysFromNow(-10),
  mockChecksum: checksumForSections(rcv1Sections),
  publishedAtUtc: daysFromNow(-24) + 'T14:30:00.000Z',
  provenance: melProvenance,
};

const catalogueSections = contentFieldsFromMarkdown(
  'The G650ER illustrated parts catalogue is published by Gulfstream and read in their portal. '
  + 'myGFO records where it lives so it can be found from here; it is not carried on the aircraft '
  + 'and nothing in myGFO attests its content.',
  'RCV-002',
);

const rcv2r1: DocRevision = {
  id: 'RCV-002-r1',
  docId: 'RCV-002',
  revision: '2026-06',
  status: 'published',
  ...catalogueSections,
  changeSummary: '',
  effectiveDate: daysFromNow(-60),
  authorUserId: 'USR005',
  authorName: 'Lisa Anderson',
  requireAcknowledgment: false,
  ackLevel: 'none',
  publishedAtUtc: daysFromNow(-60) + 'T09:00:00.000Z',
  provenance: {
    origin: 'external-pointer' as const,
    sourceLabel: 'myGulfstream technical publications portal',
  },
};

const RECEIVED_SEED_DOCS: Doc[] = [
  {
    id: 'RCV-001',
    classId: 'received-document',
    title: 'D195 Master Minimum Equipment List',
    category: 'Airworthiness',
    roles: ['all'],
    ownerUserId: 'USR005',
    ownerName: 'Lisa Anderson',
    tags: ['MEL', 'deferrals', 'carriage'],
    isPinned: true,
    isArchived: false,
    reviewCycleDays: 365,
    nextReviewDate: daysFromNow(341),
    createdDate: '2025-06-01',
    source: {
      kind: 'sharepoint',
      driveId: 'b!demo-flightops-drive',
      itemId: '01DEMOMELITEM',
      label: 'P&G SharePoint — Flight Ops / MEL',
      lastConfirmedAtUtc: daysFromNow(-24) + 'T14:10:00.000Z',
      lastConfirmedByUserId: 'USR005',
      lastConfirmedByName: 'Lisa Anderson',
    },
  },
  {
    id: 'RCV-002',
    classId: 'received-document',
    title: 'G650ER Illustrated Parts Catalogue',
    category: 'Manufacturer',
    roles: ['maintenance', 'dom', 'lead', 'admin'],
    ownerUserId: 'USR005',
    ownerName: 'Lisa Anderson',
    tags: ['OEM', 'parts'],
    isPinned: false,
    isArchived: false,
    createdDate: '2025-03-01',
    source: {
      kind: 'vendor-portal',
      webUrl: 'https://my.gulfstream.com/',
      label: 'myGulfstream technical publications portal',
      lastConfirmedAtUtc: daysFromNow(-60) + 'T09:00:00.000Z',
      lastConfirmedByUserId: 'USR005',
      lastConfirmedByName: 'Lisa Anderson',
    },
  },
];

const SEED_DOCS: Doc[] = [
  {
    id: 'SOP-001',
    classId: 'sop',
    title: 'Stabilized Approach Criteria',
    category: 'Flight Operations',
    roles: ['pilot', 'lead', 'admin'],
    ownerUserId: 'USR007',
    ownerName: 'First Officer Emily Chen',
    tags: ['approach', 'go-around', 'standards'],
    isPinned: true,
    isArchived: false,
    reviewCycleDays: 365,
    nextReviewDate: daysFromNow(362),
    createdDate: '2025-02-10',
  },
  {
    id: 'SOP-002',
    classId: 'sop',
    title: 'EFB Chart Currency Verification',
    category: 'Flight Operations',
    roles: ['pilot', 'scheduling', 'lead', 'admin'],
    ownerUserId: 'role:procedural-specialist',
    ownerName: 'Procedural Specialist Alvarez',
    tags: ['efb', 'charts', 'standards'],
    isPinned: false,
    isArchived: false,
    reviewCycleDays: 365,
    createdDate: daysFromNow(-6),
  },
  {
    // D64 — the CONTROLLED half of the Ship Notes split. Loading charts and the navigation database
    // is a procedure performed ON the aircraft, so it is an `sop` behind four-eyes and the shelf
    // links out to it rather than restating it in a direct-publish note.
    id: 'SOP-003',
    classId: 'sop',
    title: 'Charts and navigation database load — G650ER',
    category: 'Maintenance Procedures',
    roles: ['maintenance', 'lead', 'admin'],
    ownerUserId: 'role:procedural-specialist',
    ownerName: 'Procedural Specialist Alvarez',
    tags: ['charts', 'navdb', 'loading'],
    isPinned: false,
    isArchived: false,
    reviewCycleDays: 365,
    nextReviewDate: daysFromNow(358),
    createdDate: daysFromNow(-7),
  },
  {
    id: 'GOM-3',
    classId: 'manual',
    title: 'General Operations Manual — Ch. 3 Flight Operations',
    category: 'General Operations',
    roles: ['pilot', 'inflight', 'maintenance', 'scheduling', 'lead', 'admin'],
    ownerUserId: 'USR001',
    ownerName: 'Captain John Smith',
    tags: ['gom', 'operations', 'manual'],
    isPinned: false,
    isArchived: false,
    reviewCycleDays: 365,
    nextReviewDate: daysFromNow(-9), // overdue for periodic review
    createdDate: '2024-05-01',
  },
  gomSmsDoc,
  {
    id: 'TK-001',
    classId: 'tribal-knowledge',
    title: 'KTEB ramp construction: which FBO gates actually work',
    category: 'Airports & FBOs',
    roles: ['all'],
    ownerUserId: 'role:scheduling-manager',
    ownerName: 'Scheduling Manager Reyes',
    tags: ['kteb', 'fbo', 'ground-ops'],
    isPinned: true,
    isArchived: false,
    reviewCycleDays: 180,
    nextReviewDate: daysFromNow(168),
    createdDate: daysFromNow(-12),
  },
  {
    id: 'TK-002',
    classId: 'tribal-knowledge',
    title: 'G650 APU cold-soak starts — field notes',
    category: 'Quirks & field notes',
    roles: ['all'],
    ownerUserId: 'USR002',
    ownerName: 'Sarah Wilson',
    tags: ['g650', 'apu', 'cold-weather'],
    isPinned: false,
    isArchived: false,
    reviewCycleDays: 180,
    nextReviewDate: daysFromNow(-40), // stale — review overdue
    createdDate: daysFromNow(-220),
    // D65 — the fleet tag this entry needed now lives on `tk2r1`, its published revision.
  },
  ...casKnowledgeSeed().docs,
  ...RECEIVED_SEED_DOCS,
];

const SEED_REVISIONS: DocRevision[] = [
  sop1r1, sop1r2, sop2r1, sop3r1, gom3r1, gomSmsR1, tk1r1, tk2r1,
  // D73 — the two ways myGFO holds a document it did not author.
  rcv1r1, rcv2r1,
  // D60 CAS knowledge — a fresh install gets these here; an existing store gets them
  // from the version-keyed migration step (engine/migrations.ts).
  ...casKnowledgeSeed().revisions,
];

// Seeded signature-level ack on SOP-001 r2 from the Lead reader (partial compliance;
// the pilot login still owes the signature ceremony — the demo moment).
const seedSignature: Signature = {
  id: 'sig-seed-sop1-lead',
  signedEntity: 'DOC_ACK',
  signedEntityId: 'SOP-001-r2',
  signerOid: 'USR004',
  signerName: 'David Brown',
  signerRole: 'lead',
  intentStatement: 'I have read and understood SOP-001 "Stabilized Approach Criteria" rev 2.0.',
  amr: ['pwd', 'mfa'],
  authTimeUtc: daysFromNow(-2) + 'T15:05:00.000Z',
  signedAtUtc: daysFromNow(-2) + 'T15:05:00.000Z',
  mockContentHash: mockSha256('seed|SOP-001-r2|USR004').slice(0, 8),
};

const SEED_ACKS: DocAcknowledgment[] = [
  {
    docId: 'SOP-001',
    revisionId: 'SOP-001-r2',
    revision: '2.0',
    userId: 'USR004',
    userName: 'David Brown',
    role: 'lead',
    level: 'signature',
    signatureId: seedSignature.id,
    acknowledgedAtUtc: daysFromNow(-2) + 'T15:05:00.000Z',
  },
  {
    docId: 'GOM-3',
    revisionId: 'GOM-3-r1',
    revision: '12.0',
    userId: 'USR003',
    userName: 'Mike Johnson',
    role: 'inflight',
    level: 'initials',
    initials: 'MJ',
    acknowledgedAtUtc: daysFromNow(-20) + 'T10:12:00.000Z',
  },
  {
    docId: 'GOM-3',
    revisionId: 'GOM-3-r1',
    revision: '12.0',
    userId: 'USR004',
    userName: 'David Brown',
    role: 'lead',
    level: 'initials',
    initials: 'DB',
    acknowledgedAtUtc: daysFromNow(-18) + 'T08:40:00.000Z',
  },
];

const SEED_COMMENTS: DocComment[] = [
  {
    id: 'cmt-001',
    docId: 'TK-001',
    authorUserId: 'USR001',
    authorName: 'Captain John Smith',
    role: 'pilot',
    text: 'Confirmed on last week’s trip — west gate readers still dead at 2230L. North gate worked.',
    createdAtUtc: daysFromNow(-5) + 'T22:41:00.000Z',
  },
  {
    id: 'cmt-002',
    docId: 'TK-001',
    authorUserId: 'USR003',
    authorName: 'Mike Johnson',
    role: 'inflight',
    text: 'Catering deliveries also reroute to the north gate — add 15 min to the setup window.',
    createdAtUtc: daysFromNow(-4) + 'T13:02:00.000Z',
  },
];

const SEED_SUGGESTIONS: DocSuggestion[] = [
  {
    id: 'sug-001',
    docId: 'SOP-001',
    revisionId: 'SOP-001-r2',
    docTitle: 'Stabilized Approach Criteria',
    authorUserId: 'USR001',
    authorName: 'Captain John Smith',
    role: 'pilot',
    sectionRef: 'Go-Around Callout',
    proposedChange: 'Add a note that autothrottle TOGA engagement is the expected first action on the G500/G650.',
    rationale: 'New-hire sim debriefs show hesitation on who pushes TOGA — the SOP should name the action.',
    status: 'open',
    createdAtUtc: daysFromNow(-1) + 'T18:22:00.000Z',
  },
  {
    id: 'sug-002',
    docId: 'SOP-001',
    revisionId: 'SOP-001-r1',
    docTitle: 'Stabilized Approach Criteria',
    authorUserId: 'USR004',
    authorName: 'David Brown',
    role: 'lead',
    sectionRef: 'Criteria',
    proposedChange: 'Raise the circling gate to 1,000 ft AFE.',
    rationale: 'Aligns with Flight Safety Foundation ALAR recommendations.',
    status: 'accepted',
    resolvedByUserId: 'USR007',
    resolvedByName: 'First Officer Emily Chen',
    resolutionNote: 'Incorporated in rev 2.0.',
    resolvedAtUtc: daysFromNow(-4) + 'T09:00:00.000Z',
    createdAtUtc: daysFromNow(-40) + 'T11:00:00.000Z',
  },
];

const SEED_SUGGESTION_REPLIES: DocSuggestionReply[] = [];

/** Default state: module seeds + the legacy bulletin seeds mapped into the unified model. */
export function getSeedState(): DocumentsState {
  const bulletinDocs: Doc[] = [];
  const bulletinRevs: DocRevision[] = [];
  for (const b of SEED_BULLETINS) {
    const { doc, rev } = bulletinToDocAndRevision(b);
    bulletinDocs.push(doc);
    bulletinRevs.push(rev);
  }
  return {
    docs: [...SEED_DOCS, ...CABIN_SEEDS.map(cabinSeedDoc), ...bulletinDocs],
    revisions: [...SEED_REVISIONS, ...CABIN_SEEDS.map(cabinSeedRevision), ...bulletinRevs],
    acknowledgments: SEED_ACKS,
    comments: SEED_COMMENTS,
    suggestions: SEED_SUGGESTIONS,
    suggestionReplies: SEED_SUGGESTION_REPLIES,
    reviews: [],
    signatures: [seedSignature],
  };
}

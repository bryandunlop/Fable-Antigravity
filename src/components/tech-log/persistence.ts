/**
 * Tech-log persistence (TL-26) — extracted from `TechLogContext` so the durability rules are
 * testable in node, following the repo's own precedent (`contexts/hazardPersistence.ts`,
 * `notifications/storage.ts`).
 *
 * WHY THIS EXISTS. Persistence was a single 300 ms debounced whole-blob write whose cleanup
 * CANCELLED the pending write. Four independent `TechLogProvider` instances mounted on sibling
 * route subtrees — `/tech-log/*`, `/fir/*`, `/pilot-workspace/*`, and ramp mode hoisted into the
 * outer chrome-less route tree — so moving between them fully unmounted one provider and mounted
 * another. Sign a record, navigate inside 300 ms, and:
 *
 *   1. the outgoing provider's cleanup cancels the write — the signature never reaches storage;
 *   2. the incoming provider's initialiser runs during RENDER, before the outgoing cleanup runs in
 *      the commit phase, so it reads the stale blob (which is why "flush on unmount" alone cannot
 *      fix this — the ordering defeats it);
 *   3. its mount-time `SET_PERSONA` dirties state and, 300 ms later, writes the stale snapshot
 *      back — turning a delayed write into a permanent overwrite.
 *
 * Step 3 is not a rare race. `SET_PERSONA` returns a new state object unconditionally, and the
 * mount effect dispatches it on EVERY mount, so every provider mount arms a whole-blob write of
 * that instance's mount-time snapshot — including read-only ramp mode, which never dispatches
 * anything of its own and can still overwrite the tab where the signing happened.
 *
 * THE RULE. A dispatch that produces a signed or otherwise regulated record is persisted
 * SYNCHRONOUSLY, in the same commit, with no timer to outrun. That is `CLAUDE.md`'s ALWAYS rule —
 * "persist a signed record to durable storage the instant it is signed, before attempting sync" —
 * so a 300 ms debounce on a signature is a defect on principle even without the race. Chatty
 * non-regulated state stays debounced, and its pending write is flushed on unmount rather than
 * cancelled.
 *
 * STILL OPEN, deliberately not fixed here (see the TL-26 note): there is no cross-instance
 * convergence — no `storage` listener and no `BroadcastChannel` — so two tabs (ramp mode on a
 * second device is the designed use case) still last-writer-wins, and `bridge.ts` does its own
 * whole-blob read-modify-write outside React entirely. Both need their own slice.
 */

import type { TechLogAction, TechLogState } from './types';
import { type StorageLike, memoryStorage } from '../../notifications/storage';

export { memoryStorage };
export type { StorageLike };

export const STORAGE_KEY = 'tech-log-state';
export const VERSION_KEY = 'tech-log-data-version';
/**
 * Bump this whenever the persisted demo-data SHAPE changes. A mismatch drops the stored blob and
 * reseeds (see `loadPersistedState`), which is the only migration this demo has.
 *
 * v17 (D55/D56/D57): `Defect` lost `severity` and gained a NON-OPTIONAL `occurredAtUtc` plus the
 * structured CAS fields. A defect persisted before this batch has no `occurredAtUtc` at all, and it
 * is now read on every defect row (`formatRegulatoryCompact` would be handed `undefined`) and used
 * to default the PL-25 day of discovery in `DeferralCreatePanel` — so a returning user's stale rows
 * would render broken dates and seed an MEL repair clock from nothing. The field was added in an
 * earlier commit of this batch and was inert only because nothing had read a hydrated old row yet;
 * this bump is what actually closes it.
 *
 * v18 (D59): `MelItem` gained `crewActionRequired`, authored on a handful of seeded items
 * (`scenarios.ts#AUTHORED_CREW_ACTIONS`). A stored blob predating this carries the old, unauthored
 * MEL rows, so every item would silently fall back to `Boolean(oProcedure)` and the DOM's explicit
 * "no crew action" on 30-01-03 would read as a crew action — i.e. the seeded authoring would simply
 * not exist for a returning user. Reseeding is the fix. (The new `Deferral` columns need no
 * migration: absent reads as "no crew action", which is correct for rows signed under the old rule
 * and is never reinterpreted.)
 *
 * v19 (LG-98/99/108): `WorkCard` gained `ammReference` + `cmcFaultCodes`, and the seeds now populate
 * them on wc-1 and wc-3 plus `Defect.cmcFaultCode` on d-n1pg. Unlike v17 this is NOT a
 * broken-render risk — every new field is optional and absent reads correctly as "not recorded".
 * The bump is for the SEEDS: a returning user's stored blob predates them, so the demo would show
 * empty AMM/CMC panels and no pilot intake hint, and the CRS print test's fixtures would be the only
 * place the feature was visible. Reseeding is what makes the slice demonstrable on a fresh load.
 *
 * v20 (D61/D62/D63, LG-100): `WorkCard` gained `statusTags` states (DIAGNOSING, WAITING_TECH_REP,
 * WAITING_CONTRACT_MX, WAITING_OTHER, GAP), the per-gap include/exclude flag, `partsOrders`, and the
 * `timeAudit` trail. Every new field is optional and absent reads correctly, so like v19 this is not
 * a broken-render risk — the bump exists so a returning user's stored blob is replaced by seeds that
 * actually carry a logged overnight gap and a delivered parts order. Without it the include/exclude
 * control and the metrics page have nothing to act on and the slice is invisible on their machine.
 *
 * v21 (D70): the MEL catalog gained the two parts of the approved D195 MELs it never held — Section
 * Two (CAS Message Relief, 208 items) and the NEF Deferral List (287 items) — plus `melSection`,
 * `casMessage`/`casColor`/`casLevel` and `nefArea` on `MelItem`, and `category` became nullable for
 * NEF. This one is closer to v17 than to v19: `melItems` is seeded reference data, so a returning
 * user's stored blob would pin them to the old Section-One-only catalog indefinitely and two thirds
 * of their own MEL would simply not exist for them. Reseeding is the fix.
 */
export const DATA_VERSION = '2026-07-31-v21';

/**
 * Actions whose result must be durable the instant they are dispatched: every action that appends a
 * signature, a signed regulatory row, a supersede of one, or the audit entry that records it.
 * `EDIT_BRIEFING` is in the set because it is how a release/acknowledgement signature id is attached
 * to a briefing — the briefing's own signing moment.
 */
export const DURABLE_ACTIONS: ReadonlySet<TechLogAction['type']> = new Set<TechLogAction['type']>([
  'ADD_SIGNATURE',
  'ADD_RELEASE',
  'ADD_DEFECT', 'SUPERSEDE_DEFECT',
  'ADD_DEFERRAL', 'SUPERSEDE_DEFERRAL',
  'ADD_FLIGHTLOG', 'SUPERSEDE_FLIGHTLOG',
  'ADD_POSTFLIGHT', 'SUPERSEDE_POSTFLIGHT',
  'ADD_BRIEFING', 'EDIT_BRIEFING',
  'ADD_AUDIT',
  'ADD_LABOR_ENTRY',
  'EDIT_CHECKLIST_INSTANCE',
  'DECIDE_APPROVAL',
  'ACK_AOG',
]);

export function isDurableAction(type: TechLogAction['type']): boolean {
  return DURABLE_ACTIONS.has(type);
}

/** Synchronous whole-state write. Never throws — a full quota must not break the signing flow. */
export function persistState(storage: StorageLike | null, state: TechLogState): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full/unavailable — ignore for the demo */
  }
}

/**
 * Version-gated hydration. A data-version mismatch drops the stored blob and reseeds, so a schema
 * addition (a new frozen column) cannot leave half-shaped rows behind.
 */
export function loadPersistedState(
  storage: StorageLike | null,
  seed: () => TechLogState,
): TechLogState {
  if (!storage) return seed();
  try {
    if (storage.getItem(VERSION_KEY) !== DATA_VERSION) {
      storage.removeItem(STORAGE_KEY);
      storage.setItem(VERSION_KEY, DATA_VERSION);
      return seed();
    }
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? { ...seed(), ...JSON.parse(raw) } : seed();
  } catch {
    return seed();
  }
}

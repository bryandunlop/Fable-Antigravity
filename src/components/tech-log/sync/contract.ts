/**
 * The tech-log sync contract (TL-38).
 *
 * WHAT THIS IS FOR. Work-in-progress on a work card lives in one browser's `localStorage`, so a card
 * left mid-task is invisible to the next technician on any other device. Closing that needs a server.
 * The server is the dev's half of the build; this file is the **contract between the two halves**,
 * written from the front end so the shape is agreed before either side is wired.
 *
 * WHAT IS AND IS NOT LIVE. Everything in `./localTransport` is live — it is the demo's stand-in
 * server, and it genuinely converges two browser tabs on one machine. `./httpTransport` is the real
 * implementation against the routes below; it is **written and deliberately not imported**. Wiring it
 * is one line in `useSync` and is the dev's call, not a flag for the demo to flip.
 *
 * THE THREE THINGS A SERVER OWNS THAT A `localStorage` BLOB DOES NOT:
 *
 *   1. **Order.** The server assigns `revision`. Two devices editing one card do not both win; the
 *      second one is told it lost (409) and shows the user what changed. Today they last-writer-win
 *      in silence.
 *   2. **Time.** `serverAtUtc` is stamped by the server, never the client — `CLAUDE.md`'s "re-stamp
 *      server-authoritative UTC timestamps at commit; client timestamps are advisory". A client clock
 *      can be wrong or deliberately wrong, and this data feeds a regulatory record.
 *   3. **Exactly-once.** Every op carries a client-generated `idempotencyKey`, immutable across
 *      retries. A lost ACK on a re-sent op returns the ORIGINAL response, not a second labor line.
 *      This is why the outbox retries safely.
 *
 * SCOPE. Work cards only — the TL-38 workflow. The signed append-only records (defects, deferrals,
 * flight logs, releases, signatures) are a strictly larger problem: they need the hash chain and the
 * `prev_signature_hash` server ordering from `PHASE1_BUILD_SPEC.md` §5, and putting them behind a
 * transport that has not been designed for that would be worse than leaving them alone. A work card
 * is plain updatable WIP, which is exactly why it is the honest first entity. See `./README.md`.
 */

import type { LaborEntry, PartsOrder, StatusTagEvent, WorkCard, WorkCardTimeAuditEvent } from '../types';

/** Bumped when a wire shape changes incompatibly. The server rejects an op it cannot read. */
export const SYNC_PROTOCOL_VERSION = 1;

// ── Server-owned fields ──────────────────────────────────────────────────────────────────────────

/**
 * What the server stamps onto every entity it stores. The client never authors these — it reads them
 * back. A card the client has never successfully sent has no stamp at all, which is how the UI tells
 * "not yet saved anywhere" from "saved, 2 minutes ago".
 */
export interface ServerStamp {
  /**
   * Monotonic per entity, assigned by the server. The client sends the revision it *based its edit
   * on*; a mismatch is a conflict. This is optimistic concurrency — an ETag by another name — and it
   * is the whole reason two techs on two iPads cannot silently overwrite each other.
   */
  revision: number;
  /** Server clock at commit. Advisory client timestamps never overwrite this. */
  serverAtUtc: string;
  /** Entra OID of whoever's request produced this revision. Displayed as "last touched by". */
  updatedByOid: string;
  /**
   * Frozen display name of that person, snapshotted at commit rather than live-joined to Personnel.
   * Same rule as `LaborEntry.techName` (TL-16): a rename must not repaint history.
   */
  updatedByName: string;
}

/**
 * A work card as the server returns it — **card plus its labor entries**, because on the wire the
 * card is the aggregate.
 *
 * The app's own state keeps `laborEntries` in a flat top-level list, which is convenient for the
 * metrics rollups that read across cards. That is a client-side view, not the transfer shape: hours
 * logged against a card are the single most important thing TL-38 has to carry to the next
 * technician, and leaving them outside the transferred object would have meant a colleague's card
 * arrived on another device with its work history missing — the exact bug, wearing a fix's clothes.
 * One aggregate also means one revision covers both, so card and hours cannot arrive half-applied.
 */
export type StampedWorkCard = WorkCard & { stamp: ServerStamp; laborEntries: LaborEntry[] };

// ── Operations ───────────────────────────────────────────────────────────────────────────────────

/**
 * The mutations a client can send. Deliberately narrow and *semantic* — `labor.add`, not
 * `card.replace`. A whole-object PUT would make every concurrent edit a conflict even when two techs
 * touched unrelated fields, which is the failure mode that makes people stop trusting the sync.
 */
export type SyncOpKind =
  | 'workcard.patch'          // WIP fields: references, CMC codes, description, status
  | 'workcard.labor.add'
  | 'workcard.labor.delete'
  | 'workcard.parts.add'
  | 'workcard.parts.receive'
  | 'workcard.statustag.add'
  | 'workcard.timeline.set';  // wholesale edit of the time history — see below

export interface SyncOpPayloads {
  /**
   * `references`, not `ammReference` (D68). The old single-string field is read-only from here on
   * — `cardReferences` is the only thing that still reads it — so naming it in a *write* payload
   * would invite a caller to resurrect the superseded shape. `SyncOpKind` above already said
   * "references" in its comment while this type still said `ammReference`; the type was wrong.
   */
  'workcard.patch': Partial<Pick<WorkCard, 'title' | 'description' | 'references' | 'cmcFaultCodes' | 'status' | 'riiRequired'>>;
  'workcard.labor.add': LaborEntry;
  'workcard.labor.delete': { laborEntryId: string };
  'workcard.parts.add': PartsOrder;
  'workcard.parts.receive': { partsOrderId: string; receivedAtUtc: string };
  'workcard.statustag.add': { tag: StatusTagEvent; audit: WorkCardTimeAuditEvent };
  /**
   * The retrospective time-entry surface (D61's `WorkTimelinePanel`) edits the whole history as a
   * unit — reasons, notes, and the per-gap include/exclude flag — rather than appending one event,
   * so it needs a wholesale op. It carries `timeAudit` with it because D62 makes that the append-only
   * record of every edit to `statusTags`, and shipping the two apart would let the history and its
   * audit trail arrive at the server out of step.
   *
   * Revision-gated (it does NOT commute): this replaces the time history rather than adding to it,
   * so a concurrent edit really is a conflict and really does need a person.
   */
  'workcard.timeline.set': { statusTags: StatusTagEvent[]; timeAudit: WorkCardTimeAuditEvent[] };
}

export interface SyncOp<K extends SyncOpKind = SyncOpKind> {
  /**
   * UUIDv7, generated by the client at the moment of the mutation and **immutable across retries**
   * (`CLAUDE.md` → Idempotency keys). The server stores the outcome against this key, so a retry
   * after a lost ACK returns the identical response instead of appending a duplicate row.
   */
  idempotencyKey: string;
  kind: K;
  workCardId: string;
  payload: SyncOpPayloads[K];
  /**
   * The `stamp.revision` this edit was composed against, or `null` for a card the client has never
   * seen a stamp for. The server compares this to the card's current revision.
   *
   * `labor.add` is the interesting exception: it is an APPEND, so it commutes with any other edit and
   * the server accepts it at any base revision. Making appends conflict would mean a tech's logged
   * hours could be rejected because someone else edited the title, which is indefensible when the
   * hours are the thing we promised not to lose.
   */
  baseRevision: number | null;
  /** Client clock. **Advisory only** — recorded for diagnostics, never trusted for ordering. */
  clientAtUtc: string;
  /** Who composed it, client-asserted. The server re-derives this from the bearer token. */
  actorOid: string;
}

// ── Responses ────────────────────────────────────────────────────────────────────────────────────

export interface SyncAccepted {
  outcome: 'ACCEPTED';
  idempotencyKey: string;
  card: StampedWorkCard;
  /** True when this was a replay of an already-applied key rather than a fresh commit. */
  replayed: boolean;
}

/**
 * The card moved underneath this edit. The client is handed the server's current card so it can show
 * the user what actually changed rather than a bare "try again".
 */
export interface SyncConflict {
  outcome: 'CONFLICT';
  idempotencyKey: string;
  current: StampedWorkCard;
  attemptedBaseRevision: number | null;
}

/** Malformed, unauthorized, or unknown card. Not retryable — retrying will fail identically. */
export interface SyncRejected {
  outcome: 'REJECTED';
  idempotencyKey: string;
  reason: string;
}

export type SyncResult = SyncAccepted | SyncConflict | SyncRejected;

// ── Presence ─────────────────────────────────────────────────────────────────────────────────────

/**
 * Who else has this card open. Advisory only — it is NOT a lock, and nothing in the app gates on it.
 * A presence signal that gated writes would be a distributed lock, and a distributed lock that can be
 * held by a tablet that walked out of wifi range is how a card becomes permanently unworkable.
 * Its only job is to let a tech see a colleague is already on this before duplicating their work.
 */
export interface PresenceRecord {
  sessionId: string;
  workCardId: string;
  actorOid: string;
  actorName: string;
  /** Server time of the last heartbeat. Stale entries are dropped after `PRESENCE_TTL_MS`. */
  lastSeenAtUtc: string;
}

export const PRESENCE_HEARTBEAT_MS = 15_000;
export const PRESENCE_TTL_MS = 45_000;

// ── Transport ────────────────────────────────────────────────────────────────────────────────────

/**
 * The one seam between the app and wherever the data actually lives. `localTransport` implements it
 * over `BroadcastChannel`; `httpTransport` implements it over the routes in `./README.md`. Nothing
 * above this interface knows or cares which.
 */
export interface SyncTransport {
  readonly name: string;
  /** Submit one op. Resolves with the server's verdict; rejects only on transport failure (offline). */
  submit(op: SyncOp): Promise<SyncResult>;
  /** Full read of every card the caller may see. Used on mount and after regaining connectivity. */
  fetchCards(): Promise<StampedWorkCard[]>;
  /** Announce this session is on a card. `workCardId: null` clears it. */
  heartbeat(workCardId: string | null): Promise<void>;
  /** Live presence for a card, excluding this session. */
  presence(workCardId: string): Promise<PresenceRecord[]>;
  /**
   * Push notification of someone else's commit. On a real backend this is SignalR/WebSocket; the
   * local transport uses `BroadcastChannel`. Returns an unsubscribe.
   */
  subscribe(onRemoteChange: (card: StampedWorkCard) => void): () => void;
}

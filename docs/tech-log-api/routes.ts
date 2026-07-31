/**
 * REFERENCE BACKEND — TL-38 work-card sync.
 *
 * ███ NOT SHIPPED CODE. ███ `tsconfig` includes only `src`, so nothing here compiles into the app or
 * runs anywhere. It exists so the backend dev can see exactly what the front end was built against,
 * in code rather than in prose, including the parts that are easy to get subtly wrong.
 *
 * Written as Express-flavoured handlers because the shape reads clearly, not because Express is the
 * recommendation. `PHASE1_BUILD_SPEC.md` §2 puts the API on App Service / Container Apps / Functions;
 * translate freely. What must NOT be translated freely is the four rules in `./README.md`.
 *
 * Read `./README.md` first, then `./schema.sql`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

type Request = any;
type Response = any;
type Router = any;

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Dependencies the real implementation supplies. Written as an interface so the handlers below say
// what they need without pretending to know your data layer.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

interface Deps {
  /**
   * Runs `fn` inside a single transaction with the target card row LOCKED for update
   * (`SELECT … FOR UPDATE`, or `UPDLOCK, ROWLOCK` on Azure SQL).
   *
   * THIS IS NOT OPTIONAL AND IT IS THE EASIEST THING HERE TO GET WRONG. Read-then-write without the
   * lock means two concurrent ops can both read revision 7, both find their base revision valid, and
   * both write revision 8 — which is precisely the lost update that revisions exist to prevent, now
   * with a green tick in the UI telling the technician their work is safe. The stand-in server never
   * had to face this because `localStorage` is single-threaded; you do.
   */
  withCardLock<T>(cardId: string, fn: (tx: Tx) => Promise<T>): Promise<T>;
  /** Entra token → actor. Never trust `actorOid` from the body; the client asserts it, you derive it. */
  actorFrom(req: Request): Promise<{ oid: string; displayName: string }>;
  /** Tail-level authorization. The stand-in server has none of this. */
  mayTouchCard(actorOid: string, cardId: string): Promise<boolean>;
  now(): Date;
}

interface Tx {
  getCard(cardId: string): Promise<StampedWorkCard | null>;
  putCard(card: StampedWorkCard): Promise<void>;
  listCards(actorOid: string): Promise<StampedWorkCard[]>;
  /** Stored RESPONSE against the key, not a bare "seen" flag — see rule 4 in the README. */
  getIdempotent(key: string): Promise<SyncResult | null>;
  putIdempotent(key: string, result: SyncResult): Promise<void>;
  appendAudit(row: { actorOid: string; action: string; entityId: string; atUtc: string; summary: string }): Promise<void>;
}

// Shapes are imported from the front end's contract in the real thing — they are the same types.
// Reproduced as `any` here only so this file reads standalone.
type StampedWorkCard = any;
type SyncOp = any;
type SyncResult = any;

// The one function that must NOT be re-derived. Import it from the front-end contract module (it is
// pure and dependency-free) so the client and server cannot drift on "who wins".
declare function applyOp(
  card: StampedWorkCard,
  op: SyncOp,
  server: { serverAtUtc: string; updatedByName: string },
): { outcome: 'APPLIED'; card: StampedWorkCard } | { outcome: 'CONFLICT' };

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────────────────────────

export function mountTechLogApi(router: Router, deps: Deps): void {
  /**
   * GET /work-cards — the full picture for this actor.
   *
   * Returns the aggregate: each card WITH its `laborEntries`. Do not split these into two endpoints
   * "for cleanliness". The client applies a card and its hours as one unit precisely so a colleague's
   * card can never arrive on another device with its work history missing.
   */
  router.get('/work-cards', async (req: Request, res: Response) => {
    const actor = await deps.actorFrom(req);
    const cards = await deps.withCardLock('*', tx => tx.listCards(actor.oid));
    res.json(cards);
  });

  /**
   * POST /work-cards/:id/ops — one mutation.
   *
   * Headers:
   *   Idempotency-Key: <uuidv7>     required
   *   If-Match: "<revision>"        optional; absent means "I make no concurrency claim"
   */
  router.post('/work-cards/:id/ops', async (req: Request, res: Response) => {
    const key = req.header('Idempotency-Key');
    if (!key) return res.status(400).json({ reason: 'Idempotency-Key header is required' });

    const actor = await deps.actorFrom(req);
    const cardId = req.params.id;

    if (!(await deps.mayTouchCard(actor.oid, cardId))) {
      // 403, NOT 404. The client treats every non-409 4xx as terminal, so either works mechanically;
      // 403 is the honest answer and keeps the audit trail readable.
      return res.status(403).json({ reason: 'Not authorized for this aircraft' });
    }

    // `If-Match: "7"` → 7. Absent → null. A malformed value is a 400, not a silent null: silently
    // downgrading a broken concurrency claim to "no claim" turns a client bug into a lost update.
    const ifMatch = req.header('If-Match');
    let baseRevision: number | null = null;
    if (ifMatch !== undefined) {
      const parsed = Number(ifMatch.replace(/"/g, ''));
      if (!Number.isInteger(parsed)) return res.status(400).json({ reason: 'Malformed If-Match' });
      baseRevision = parsed;
    }

    const result = await deps.withCardLock(cardId, async tx => {
      // Idempotency FIRST, inside the lock, before any state is read for the apply. A replay must
      // return the original response byte-for-byte, not re-apply and not conflict.
      const prior = await tx.getIdempotent(key);
      if (prior) return prior.outcome === 'ACCEPTED' ? { ...prior, replayed: true } : prior;

      const card = await tx.getCard(cardId);
      if (!card) return { outcome: 'REJECTED', idempotencyKey: key, reason: `No work card ${cardId}` };

      const op: SyncOp = {
        idempotencyKey: key,
        kind: req.body.kind,
        workCardId: cardId,
        payload: req.body.payload,
        baseRevision,
        clientAtUtc: req.body.clientAtUtc, // advisory — recorded, never trusted for ordering
        actorOid: actor.oid,               // DERIVED from the token, not read from the body
      };

      // VALIDATE THE PAYLOAD HERE, before it reaches the ledger-adjacent store. `CLAUDE.md` forbids
      // request bodies and PII reaching an append-only column, and an append-only column cannot be
      // scrubbed afterwards — dropped ledger columns physically remain. Scrub at the boundary or not
      // at all.

      const applied = applyOp(card, op, {
        serverAtUtc: deps.now().toISOString(), // YOUR clock. Rule 2.
        updatedByName: actor.displayName,      // frozen, not live-joined. Rule 3.
      });

      if (applied.outcome === 'CONFLICT') {
        // NOT recorded against the idempotency key — the same key may legitimately be retried after
        // the client rebases onto the current revision, and burning it here replays the failure
        // forever. Return the server's current card so the UI can show what actually changed.
        return { outcome: 'CONFLICT', idempotencyKey: key, current: card, attemptedBaseRevision: baseRevision };
      }

      // Card body, labor lines and the idempotency record commit together. A card that lands without
      // its labor line is the TL-38 bug with extra steps.
      await tx.putCard(applied.card);
      const accepted = { outcome: 'ACCEPTED', idempotencyKey: key, card: applied.card, replayed: false };
      await tx.putIdempotent(key, accepted);
      await tx.appendAudit({
        actorOid: actor.oid,
        action: `WORKCARD_${op.kind.toUpperCase().replace(/\./g, '_')}`,
        entityId: cardId,
        atUtc: deps.now().toISOString(),
        // Identifiers and outcome only — never the payload. `CLAUDE.md` logging rule.
        summary: `${op.kind} on ${cardId} → revision ${applied.card.stamp.revision}`,
      });
      return accepted;
    });

    if (result.outcome === 'CONFLICT') return res.status(409).json({ current: result.current });
    if (result.outcome === 'REJECTED') return res.status(422).json({ reason: result.reason });
    res.json({ card: result.card, replayed: result.replayed });

    // AFTER the response, fan out to whoever else has this card open. Phase 2 (SignalR) — see the
    // README. Until it exists the client converges on fetch at mount / reconnect / tab focus.
    // notifyWatchers(cardId, result.card);
  });

  /** POST /presence/heartbeat — advisory. Never a lock; see `contract.ts#PresenceRecord`. */
  router.post('/presence/heartbeat', async (req: Request, res: Response) => {
    const actor = await deps.actorFrom(req);
    // UPSERT on (sessionId), storing workCardId | null and lastSeenAtUtc = now().
    // Needs a TTL sweep — the client filters stale entries for display, which keeps the UI honest but
    // does nothing about the table growing without bound.
    res.status(204).end();
  });

  /** GET /presence?workCardId= — everyone except the caller's own session, within the TTL. */
  router.get('/presence', async (req: Request, res: Response) => {
    res.json([]);
  });
}

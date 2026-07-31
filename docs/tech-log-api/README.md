# Tech-log work-card API — handoff to the backend dev (TL-38)

**Status: the front end is finished and the connection points are dead on purpose.**

The demo runs against a stand-in server that lives in the browser
(`src/components/tech-log/sync/localTransport.ts`). It is not a mock — it assigns real revisions,
enforces real optimistic concurrency, replays real idempotency keys and produces real conflicts, so
the UI has been driven against a server that says *no*. What it cannot do is cross a network, which
is why a card left on one iPad is still invisible on another. That last step is yours.

Everything in this folder is **reference code, not shipped code**. `tsconfig` includes only `src`, so
nothing here compiles into the app. Read it as "here is the shape the front end was built against",
not as a library to import.

---

## Wiring it up

One line, in `src/components/tech-log/sync/useSync.tsx`:

```ts
const transport = useMemo(() => createHttpTransport({ baseUrl: '/api/tech-log', getToken }), [getToken]);
```

replacing the `createLocalTransport({...})` call. `createHttpTransport` already exists, fully written,
in `src/components/tech-log/sync/httpTransport.ts`. Nothing else in the app changes — that is what the
seam was for. Read that file's header before you flip it; it lists the three things it does *not* do.

---

## The contract in one page

| | |
|---|---|
| `GET /api/tech-log/work-cards` | Every card the caller may see, each with its `stamp` and its `laborEntries`. |
| `POST /api/tech-log/work-cards/{id}/ops` | One mutation. `Idempotency-Key` header required. `If-Match: "<revision>"` optional. |
| `POST /api/tech-log/presence/heartbeat` | `{ workCardId \| null }`. Advisory. |
| `GET /api/tech-log/presence?workCardId=` | Who else has it open. Advisory. |

**Responses to `POST …/ops`:**

- `200` — applied. Body `{ card, replayed }`. `card` is the full aggregate at its new revision.
- `409` — the card moved. Body `{ current }` — the server's card, so the UI can show what actually
  changed instead of a bare "try again". **Send the card, not just the status.**
- `4xx` — malformed / unauthorized / unknown card. The client treats this as terminal and will not
  retry. Getting this boundary wrong in either direction is how a queue either spins forever or
  silently drops a technician's work.
- `5xx` or a dropped connection — the client treats it as retryable and backs off.

**Op kinds** (`SyncOpKind` in `src/components/tech-log/sync/contract.ts`): `workcard.patch`,
`workcard.labor.add`, `workcard.labor.delete`, `workcard.parts.add`, `workcard.parts.receive`,
`workcard.statustag.add`, `workcard.timeline.set`.

---

## Five rules the front end already depends on

**1. Appends never conflict.** `labor.add`, `parts.add` and `statustag.add` are additions to a list
and are accepted at any base revision. `workcard.patch`, `parts.receive` and `timeline.set` are
revision-gated, because each overwrites something that already exists. If you make logged
hours conflict because a colleague renamed the card, you will have rejected the one thing TL-38 exists
to protect. The rule is implemented in `src/components/tech-log/sync/applyOp.ts` — **reuse that
function rather than re-deriving it**, so the two halves cannot drift.

**2. The server stamps the time.** `stamp.serverAtUtc` is your clock. `clientAtUtc` on the op is
advisory and is kept for diagnostics only. This is `CLAUDE.md`'s "re-stamp server-authoritative UTC
timestamps at commit; client timestamps are advisory", and it matters because this data feeds a
regulatory record.

**3. Freeze the display name.** `stamp.updatedByName` is snapshotted at commit, not live-joined to
Personnel — same rule as `LaborEntry.techName` (TL-16). A rename must not repaint history.

**4. Idempotency is stored, not just checked.** Store the *response* against the key and return the
identical response on replay. A conflict is deliberately **not** recorded against the key: the same
key may legitimately be retried after the client rebases, and burning it would replay the failure
forever. `localTransport.submit` shows both halves.

**5. Always return the full aggregate, even on 409.** The client REBASES on every response: it takes
your card and replays its own still-unsent ops on top (`useSync.applyServerCard`). A partial response
— the card without `laborEntries`, or a 409 with no body — makes the client rebase onto an incomplete
picture and briefly show a technician that their hours have disappeared. That flicker is not cosmetic:
a tech who sees logged hours vanish re-enters them, and now there are two labor lines. Four separate
bugs in the first cut of this front end traced to exactly this class of full-replace-without-rebase,
so the contract is stricter than it looks.

---

## What the front end does NOT need from you yet

- **Push.** `subscribe` is a stub in `httpTransport`. With it wired, the app converges on fetch —
  mount, reconnect, tab focus. A tech sees a colleague's edit on their next focus rather than
  instantly. `PHASE1_BUILD_SPEC.md` §2 puts real-time push (SignalR) in Phase 2 explicitly, so this
  is consistent — but it is a product decision and **Bryan should rule on whether next-focus is good
  enough for Phase 1**, rather than discovering it in UAT.
- **Presence storage.** A table with a TTL sweep. Nothing gates on it; if you ship it late, the
  "someone else is viewing this" line simply does not appear.

---

## What is deliberately NOT in this contract

**Signed records.** Defects, deferrals, flight logs, maintenance releases and signatures do not go
through this transport and must not be bolted onto it. They need the hash chain, the RFC 8785
canonical payload and the server-assigned `prev_signature_hash` ordering from `PHASE1_BUILD_SPEC.md`
§5 — a strictly larger problem with different failure modes. A work card is plain updatable WIP, which
is exactly why it is the honest first entity to put behind a server.

**Authorization.** The stand-in server trusts a client-asserted `actorOid` and shows every card to
everyone. Yours must derive the actor from the bearer token and scope by tail. See the notes in
`routes.ts`.

**Atomicity.** `localStorage` cannot half-commit, so the stand-in never had to think about it. You
do: card body, labor lines and the idempotency record are one transaction. A card that commits
without its labor line is the TL-38 bug with extra steps.

---

## Open questions this raises for Bryan, not for you

1. **Is next-focus convergence enough for Phase 1**, or does the shift-change workflow need push?
2. **Q7 (device model)** is load-bearing here. If iPads are shared and aircraft-resident, single-device
   persistence already covered more of the real workflow than anyone thought; if they are personal,
   it covered almost none. That answer changes how urgent this whole slice is.
3. **Conflict resolution is "re-enter it".** The UI holds the losing edit and asks the technician to
   redo it against the current card. A merge UI is possible and was not built, because guessing at
   merge semantics for maintenance records without a ruling seemed worse than an honest re-entry.

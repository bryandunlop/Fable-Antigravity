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

## Six rules the front end already depends on

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

**6. Live push is Phase 1, and it must survive scale-out.** Bryan ruled on 2026-07-31 that a
colleague's edit has to appear instantly rather than on next focus — a technician's usual two devices
are their own phone and their own laptop, so the person looking at the stale card is most often the
same person who just changed it. `GET /stream` (WebSocket) carries `{ type: 'card.changed', card }`;
the client is already written (`httpTransport.ts#subscribe`). **On more than one App Service instance
you need Azure SignalR Service or a Redis backplane**, because a publish on one instance cannot reach
a socket held by another — without it the feature is live for whoever happens to share your instance
and silently stale for everyone else, raising no error anywhere. That is the single likeliest way to
ship this broken. You do *not* need delivery guarantees: the client refetches on every connect and
reconnect, so a dropped frame self-heals. Note this contradicts `PHASE1_BUILD_SPEC.md` §2, which
parks real-time push in Phase 2 — the spec is what needs updating, not this.

---

## What the front end does NOT need from you yet

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

1. ~~Is next-focus convergence enough?~~ **Answered 2026-07-31: no — push.** See rule 6.
2. ~~Q7, the device model.~~ **Answered 2026-07-31: personal devices, but a tech is typically on
   their phone or their laptop rather than an iPad.** Two consequences for you. The common
   multi-device case is *one person* on two of their own devices, so a conflict banner usually means
   "you did this to yourself" — which is exactly why push, not next-focus. And the phone is a
   first-class client, not a fallback: the UI is already responsive to 390px, so do not assume a
   desk-bound consumer of this API.
3. **Conflict resolution is "re-enter it".** The UI holds the losing edit and asks the technician to
   redo it against the current card. A merge UI is possible and was not built, because guessing at
   merge semantics for maintenance records without a ruling seemed worse than an honest re-entry.

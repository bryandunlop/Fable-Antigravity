/**
 * Maintenance audit-trail entries (TL-14) — extracted from `MaintenanceContext` so the shape is
 * testable and so the factory stops fabricating evidence.
 *
 * WHAT WAS WRONG. `createAuditEntry` stamped a hardcoded, plausible-looking private-range IP into
 * every squawk and work-order audit trail, with `// In production, get actual IP` as the only tell
 * (the literal is deliberately not repeated here — a regression guard in the test file greps all of
 * `src/` for exactly that pattern, and this comment must not be the thing that trips it) — the same
 * fabricated-evidence pattern [[TL-13]] deleted along with `DigitalSignature.tsx`, except this one
 * is live code reached from `App.tsx`. It also hardcoded `userId: 'USER-001'` for every entry
 * whoever acted, and built ids as `` `AUDIT - ${Date.now()} - …` `` (note the stray spaces).
 *
 * WHY THE IP IS GONE RATHER THAN IMPROVED. `CLAUDE.md` classes AuditTrail as an append-only ledger
 * table, and a ledger field that cannot be populated should not exist. A grep for `ipAddress` found
 * ZERO readers — nothing renders it — so removing it breaks nothing, and it aligns this shape with
 * both live audit contracts in the repo (`scheduling/engine/types.ts` and `tech-log/types.ts`),
 * neither of which models an IP. Making the fakeness self-evident instead (`'0.0.0.0-MOCK'`) still
 * puts a meaningless value in a ledger column; populating it for real needs an API boundary this
 * prototype does not have. The failure mode was never that the value was fake — it is that a
 * reviewer, an auditor, or the engineer who productionises this cannot tell by looking at the data.
 *
 * The field names follow the scheduling engine's cleaner `AuditEntry` (`atUtc` / `actor` / `action`
 * / `detail`) rather than inventing a third dialect. Converging the two shapes wholesale is a
 * separate refactor of a 2,000-line untested context and is deliberately not attempted here.
 */

export interface AuditEntry {
  id: string;
  /** ISO-8601 UTC. `CLAUDE.md`: UTC everywhere in storage, converted for display only. */
  atUtc: string;
  /** Who acted — supplied by the caller, never an ambient literal. */
  actor: string;
  action: string;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}

export interface AuditEntryInput {
  actor: string;
  action: string;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
  /** Injectable for deterministic tests; defaults to now. */
  atUtc?: string;
}

let seq = 0;

export function createAuditEntry(input: AuditEntryInput): AuditEntry {
  const { actor, action, field, oldValue, newValue, metadata, atUtc } = input;
  const entry: AuditEntry = {
    id: `AUDIT-${Date.now().toString(36)}-${(seq++).toString(36)}`,
    atUtc: atUtc ?? new Date().toISOString(),
    actor,
    action,
  };
  // Only carry the keys that were actually supplied — an audit row should not assert an absence
  // it was never told about.
  if (field !== undefined) entry.field = field;
  if (oldValue !== undefined) entry.oldValue = oldValue;
  if (newValue !== undefined) entry.newValue = newValue;
  if (metadata !== undefined) entry.metadata = metadata;
  return entry;
}

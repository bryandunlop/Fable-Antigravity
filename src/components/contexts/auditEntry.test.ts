import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createAuditEntry } from './auditEntry';

/**
 * TL-14 — the fake evidence didn't die with the dead component.
 *
 * [[TL-13]] deleted `DigitalSignature.tsx`, which fabricated a hardcoded IP under a UI promising
 * "legal validity and tamper detection". The same pattern was still live in `MaintenanceContext`,
 * which IS imported by App.tsx: `createAuditEntry` stamped `ipAddress: '192.168.1.100'` into every
 * squawk and work-order audit trail, with an inline comment as the only tell.
 *
 * The distinction that matters is not "mock data is bad" — myGFO is a developer-handoff prototype
 * and mocks are expected. It is honest mocks vs. silent fakes: `engine/signing.ts` spells out that
 * its digest is display-only and not real hashing, so a reader cannot mistake it. A field named
 * `ipAddress` holding a well-formed private IP reads as real, and comments do not survive a grep
 * for what to trust.
 */

describe('createAuditEntry (TL-14)', () => {
  it('does not carry an ipAddress field at all', () => {
    const e = createAuditEntry({ actor: 'Tom Parker', action: 'Squawk created' });
    // Absent, not merely different: a ledger field that cannot be populated should not exist.
    expect('ipAddress' in e).toBe(false);
    expect(JSON.stringify(e)).not.toMatch(/ipAddress/);
  });

  it('takes the actor from the caller rather than a hardcoded literal', () => {
    // The old factory also hardcoded `userId: 'USER-001'` for every entry, whoever acted.
    const e = createAuditEntry({ actor: 'Amanda Brooks', action: 'Updated status' });
    expect(e.actor).toBe('Amanda Brooks');
    expect(JSON.stringify(e)).not.toMatch(/USER-001/);
  });

  it('records the instant as an ISO-8601 UTC string (CLAUDE.md: UTC everywhere in storage)', () => {
    const e = createAuditEntry({ actor: 'x', action: 'y' });
    expect(e.atUtc).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('produces an id with no stray whitespace', () => {
    // Every id template in the old file read `AUDIT - ${Date.now()} - ...`, yielding a trailing space.
    const { id } = createAuditEntry({ actor: 'x', action: 'y' });
    expect(id).toBe(id.trim());
    expect(id).not.toMatch(/\s/);
  });

  it('carries a field change when one is supplied, and omits it otherwise', () => {
    const changed = createAuditEntry({ actor: 'x', action: 'Updated status', field: 'status', oldValue: 'open', newValue: 'closed' });
    expect(changed).toMatchObject({ field: 'status', oldValue: 'open', newValue: 'closed' });
    expect('field' in createAuditEntry({ actor: 'x', action: 'y' })).toBe(false);
  });
});

describe('no source file fabricates a network address (TL-14 regression guard)', () => {
  const SRC = join(__dirname, '..', '..');
  const PRIVATE_IP = /\b(?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/;

  const walk = (dir: string, out: string[] = []): string[] => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.tsx?$/.test(name)) out.push(p);
    }
    return out;
  };

  it('finds no hardcoded private-range IP anywhere in src/', () => {
    // A guard, not a style rule: the pattern returned once already (TL-13 -> TL-14), and a
    // plausible-looking value in an append-only audit column is worse than an absent one — a
    // reviewer or auditor cannot tell it is fake by looking at the data.
    const offenders = walk(SRC)
      .filter(f => !f.endsWith('auditEntry.test.ts'))
      .filter(f => PRIVATE_IP.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import { SEED_BULLETINS } from '../../bulletins/mockData';
import type { BulletinAcknowledgment } from '../../bulletins/types';
import { unacknowledgedMustReads } from '../../bulletins/engine/acknowledgments';
import {
  docToBulletin,
  bulletinToDocAndRevision,
  ackToDocAck,
  importLegacyBulletins,
  bulletinClassId,
  isBulletinClass,
} from './bulletinCompat';
import { unacknowledgedRequiredReads } from './acknowledgments';

describe('bulletinCompat round-trip', () => {
  it('SEED_BULLETINS → doc/revision → bulletin reproduces every field', () => {
    for (const b of SEED_BULLETINS) {
      const { doc, rev } = bulletinToDocAndRevision(b);
      expect(docToBulletin(doc, rev)).toEqual(b);
    }
  });
  it('classId mapping is stable both ways', () => {
    expect(bulletinClassId('procedural')).toBe('procedural-bulletin');
    expect(bulletinClassId('flight-ops')).toBe('flight-ops-bulletin');
    expect(isBulletinClass('procedural-bulletin')).toBe(true);
    expect(isBulletinClass('sop')).toBe(false);
  });
  it('requireAcknowledgment maps to ackLevel initials', () => {
    const withAck = SEED_BULLETINS.find((b) => b.requireAcknowledgment)!;
    const without = SEED_BULLETINS.find((b) => !b.requireAcknowledgment)!;
    expect(bulletinToDocAndRevision(withAck).rev.ackLevel).toBe('initials');
    expect(bulletinToDocAndRevision(without).rev.ackLevel).toBe('none');
  });
});

describe('importLegacyBulletins (migrate, not wipe)', () => {
  const legacyAck: BulletinAcknowledgment = {
    bulletinId: 'PB-001',
    bulletinVersion: '1.1', // PB-001's live version in the seeds
    userId: 'USR001',
    userName: 'Captain John Smith',
    role: 'pilot',
    initials: 'JS',
    acknowledgedAtUtc: '2026-07-08T10:00:00.000Z',
  };
  const staleAck: BulletinAcknowledgment = {
    ...legacyAck,
    userId: 'USR004',
    userName: 'David Brown',
    role: 'lead',
    initials: 'DB',
    bulletinVersion: '1.0', // acked an OLD version — must stay re-armed
  };
  const raw = JSON.stringify({ bulletins: SEED_BULLETINS, acknowledgments: [legacyAck, staleAck] });

  it('returns null on absent or unreadable payloads', () => {
    expect(importLegacyBulletins(null)).toBeNull();
    expect(importLegacyBulletins('not json')).toBeNull();
    expect(importLegacyBulletins('{"nope":1}')).toBeNull();
  });

  it('imports docs, revisions, and ack history', () => {
    const out = importLegacyBulletins(raw)!;
    expect(out.docs).toHaveLength(SEED_BULLETINS.length);
    expect(out.revisions).toHaveLength(SEED_BULLETINS.length);
    expect(out.acknowledgments).toHaveLength(2);
  });

  it('old and new engines agree: current-version acks satisfy, stale acks stay armed', () => {
    const out = importLegacyBulletins(raw)!;
    // Legacy engine verdicts on the same raw data:
    const legacyOutstandingPilot = unacknowledgedMustReads(SEED_BULLETINS, [legacyAck, staleAck], 'pilot', 'USR001');
    const legacyOutstandingLead = unacknowledgedMustReads(SEED_BULLETINS, [legacyAck, staleAck], 'lead', 'USR004');
    // New engine verdicts on the imported data:
    const newOutstandingPilot = unacknowledgedRequiredReads(out.docs, out.revisions, out.acknowledgments, 'pilot', 'USR001');
    const newOutstandingLead = unacknowledgedRequiredReads(out.docs, out.revisions, out.acknowledgments, 'lead', 'USR004');
    expect(newOutstandingPilot.map((x) => x.doc.id).sort()).toEqual(legacyOutstandingPilot.map((b) => b.id).sort());
    expect(newOutstandingLead.map((x) => x.doc.id).sort()).toEqual(legacyOutstandingLead.map((b) => b.id).sort());
    // The stale lead ack keeps PB-001 armed for USR004 under both engines.
    expect(newOutstandingLead.some((x) => x.doc.id === 'PB-001')).toBe(true);
    // The current-version pilot ack clears PB-001 for USR001 under both engines.
    expect(newOutstandingPilot.some((x) => x.doc.id === 'PB-001')).toBe(false);
  });

  it('ackToDocAck preserves identity and initials', () => {
    const mapped = ackToDocAck(legacyAck, 'PB-001-r1');
    expect(mapped).toMatchObject({
      docId: 'PB-001',
      revisionId: 'PB-001-r1',
      revision: '1.1',
      userId: 'USR001',
      level: 'initials',
      initials: 'JS',
    });
  });
});

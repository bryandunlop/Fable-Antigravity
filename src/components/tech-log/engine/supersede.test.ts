import { describe, it, expect } from 'vitest';
import { currentRows, latestFor, wouldFork, buildSupersedeConflict } from './supersede';

describe('supersede', () => {
  it('drops a row that has been superseded', () => {
    const rows = [
      { id: 'a', supersedesId: undefined },
      { id: 'b', supersedesId: 'a' }, // b supersedes a
    ];
    expect(currentRows(rows).map(r => r.id)).toEqual(['b']);
  });

  it('keeps independent current rows', () => {
    const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c', supersedesId: 'b' }];
    expect(currentRows(rows).map(r => r.id).sort()).toEqual(['a', 'c']);
  });

  it('latestFor walks the chain to the head', () => {
    const rows = [{ id: 'a' }, { id: 'b', supersedesId: 'a' }, { id: 'c', supersedesId: 'b' }];
    expect(latestFor(rows, 'a')?.id).toBe('c');
  });
});

describe('wouldFork', () => {
  it('is false when no row supersedes the given id', () => {
    const rows = [{ id: 'a' }, { id: 'b', supersedesId: 'a' }];
    expect(wouldFork(rows, 'z')).toBe(false);
  });

  it('is false for the first, only supersede of a parent', () => {
    const rows = [{ id: 'a' }, { id: 'b', supersedesId: 'a' }];
    expect(wouldFork(rows, 'a')).toBe(true); // 'a' already has one child — a SECOND attempt would fork
  });

  it('is true once a parent already has one superseding child (a second would fork)', () => {
    const rows = [{ id: 'a' }, { id: 'b', supersedesId: 'a' }];
    // Simulates checking before inserting a second row with supersedesId: 'a'
    expect(wouldFork(rows, 'a')).toBe(true);
  });

  it('is false for a parent with zero children', () => {
    const rows = [{ id: 'a' }, { id: 'b' }];
    expect(wouldFork(rows, 'a')).toBe(false);
  });
});

describe('buildSupersedeConflict', () => {
  it('builds a conflict record and a matching audit entry', () => {
    const { conflict, audit } = buildSupersedeConflict('Defect', 'def-new', 'def-1', 'USR002', '2026-06-30T10:00:00Z');
    expect(conflict).toMatchObject({
      entityType: 'Defect',
      attemptedRowId: 'def-new',
      supersedesId: 'def-1',
      rejectedAtUtc: '2026-06-30T10:00:00Z',
      rejectedActorOid: 'USR002',
    });
    expect(conflict.id).toMatch(/^cfl-/);
    expect(audit).toMatchObject({
      actorOid: 'USR002',
      action: 'SUPERSEDE_CONFLICT_REJECTED',
      entityType: 'Defect',
      entityId: 'def-1',
      atUtc: '2026-06-30T10:00:00Z',
    });
    expect(audit.summary).toContain('def-1');
  });
});

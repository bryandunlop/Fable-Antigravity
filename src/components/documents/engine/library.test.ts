import { describe, it, expect } from 'vitest';
import type { Doc, DocRevision } from '../types';
import { groupDocsByCategory, yearsFor, matchesYear } from './library';

function doc(overrides: Partial<Doc> = {}): Doc {
  return {
    id: 'SOP-001',
    classId: 'sop',
    title: 'Test',
    category: 'Flight Operations',
    roles: ['pilot'],
    ownerUserId: 'U1',
    ownerName: 'Owner',
    tags: [],
    isPinned: false,
    isArchived: false,
    createdDate: '2026-01-01',
    ...overrides,
  };
}

function rev(overrides: Partial<DocRevision> = {}): DocRevision {
  return {
    id: 'SOP-001-r1',
    docId: 'SOP-001',
    revision: '1.0',
    status: 'published',
    content: 'x',
    changeSummary: '',
    effectiveDate: '2026-01-01',
    authorUserId: 'U1',
    authorName: 'Author',
    requireAcknowledgment: false,
    ackLevel: 'none',
    mockChecksum: 'abc',
    ...overrides,
  };
}

describe('groupDocsByCategory', () => {
  it('groups by category alphabetically', () => {
    const docs = [
      doc({ id: 'A', category: 'Safety Procedures' }),
      doc({ id: 'B', category: 'Flight Operations' }),
      doc({ id: 'C', category: 'Flight Operations' }),
    ];
    const groups = groupDocsByCategory(docs, []);
    expect(groups.map((g) => g.category)).toEqual(['Flight Operations', 'Safety Procedures']);
    expect(groups[0].docs.map((d) => d.id)).toEqual(['B', 'C']);
  });

  it('sorts pinned first within a category', () => {
    const docs = [doc({ id: 'A' }), doc({ id: 'B', isPinned: true })];
    const groups = groupDocsByCategory(docs, []);
    expect(groups[0].docs.map((d) => d.id)).toEqual(['B', 'A']);
  });

  it('sorts by most-recent effective date after pin status', () => {
    const docs = [doc({ id: 'OLD' }), doc({ id: 'NEW' })];
    const revisions = [
      rev({ id: 'OLD-r1', docId: 'OLD', effectiveDate: '2024-01-01' }),
      rev({ id: 'NEW-r1', docId: 'NEW', effectiveDate: '2026-06-01' }),
    ];
    const groups = groupDocsByCategory(docs, revisions);
    expect(groups[0].docs.map((d) => d.id)).toEqual(['NEW', 'OLD']);
  });

  it('sorts docs with no published revision to the end, then by id', () => {
    const docs = [doc({ id: 'DRAFT' }), doc({ id: 'PUB' }), doc({ id: 'ZDRAFT' })];
    const revisions = [rev({ id: 'PUB-r1', docId: 'PUB', effectiveDate: '2026-01-01' })];
    const groups = groupDocsByCategory(docs, revisions);
    expect(groups[0].docs.map((d) => d.id)).toEqual(['PUB', 'DRAFT', 'ZDRAFT']);
  });

  it('omits categories with no docs (never emits empty groups)', () => {
    expect(groupDocsByCategory([], [])).toEqual([]);
  });
});

describe('yearsFor', () => {
  it('collects distinct years from effective dates, newest first', () => {
    const docs = [doc({ id: 'A' }), doc({ id: 'B' }), doc({ id: 'C' })];
    const revisions = [
      rev({ id: 'A-r1', docId: 'A', effectiveDate: '2025-03-01' }),
      rev({ id: 'B-r1', docId: 'B', effectiveDate: '2026-01-01' }),
      rev({ id: 'C-r1', docId: 'C', effectiveDate: '2025-11-01' }),
    ];
    expect(yearsFor(docs, revisions)).toEqual(['2026', '2025']);
  });

  it('ignores docs with no published revision', () => {
    expect(yearsFor([doc()], [])).toEqual([]);
  });
});

describe('matchesYear', () => {
  it("'all' matches everything, including undated docs", () => {
    expect(matchesYear(doc(), [], 'all')).toBe(true);
  });

  it('matches only the year of the published effective date', () => {
    const revisions = [rev({ effectiveDate: '2026-07-10' })];
    expect(matchesYear(doc(), revisions, '2026')).toBe(true);
    expect(matchesYear(doc(), revisions, '2025')).toBe(false);
  });

  it('an undated doc never matches a specific year', () => {
    expect(matchesYear(doc(), [], '2026')).toBe(false);
  });
});

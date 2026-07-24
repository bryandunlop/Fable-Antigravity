import { describe, it, expect } from 'vitest';
import {
  CATEGORY_ROLE,
  auditLoadByPerson,
  suggestAuditor,
  type Auditor,
} from './assignSuggestion';

const ROSTER: Auditor[] = [
  { name: 'Sarah Wilson', role: 'Safety' },
  { name: 'Amanda Foster', role: 'Safety' },
  { name: 'Lisa Chen', role: 'Safety' },
  { name: 'Mike Johnson', role: 'Pilot' },
  { name: 'Tom Anderson', role: 'Pilot' },
  { name: 'David Brown', role: 'Maintenance' },
  { name: 'Robert Martinez', role: 'Maintenance' },
  { name: 'Emily Davis', role: 'Document Manager' },
];

// Minimal audit shape the engine reads — real Audit has more fields.
function aud(partial: Record<string, unknown>) {
  return {
    id: 'X',
    category: 'Safety Management',
    scheduledDate: '2026-03-01',
    assignedTo: 'Unassigned',
    assignedRole: '',
    ...partial,
  } as never;
}

describe('auditLoadByPerson', () => {
  it('counts assigned audits per person for the given year only', () => {
    const load = auditLoadByPerson(
      [
        aud({ assignedTo: 'Sarah Wilson', scheduledDate: '2026-02-10' }),
        aud({ assignedTo: 'Sarah Wilson', scheduledDate: '2026-09-01' }),
        aud({ assignedTo: 'Sarah Wilson', scheduledDate: '2025-12-01' }), // prior year
        aud({ assignedTo: 'Mike Johnson', scheduledDate: '2026-04-01' }),
        aud({ assignedTo: 'Unassigned', scheduledDate: '2026-04-01' }), // ignored
      ],
      2026,
    );
    expect(load).toEqual({ 'Sarah Wilson': 2, 'Mike Johnson': 1 });
  });

  it('does not count assigned audits that have no scheduledDate', () => {
    const load = auditLoadByPerson(
      [aud({ assignedTo: 'Sarah Wilson', scheduledDate: undefined, status: 'Draft' })],
      2026,
    );
    expect(load).toEqual({});
  });
});

describe('suggestAuditor', () => {
  it('prefers a role matched to the audit category, then the lightest load', () => {
    const existing = [
      aud({ assignedTo: 'Mike Johnson', scheduledDate: '2026-01-01' }), // Pilot, load 1
    ];
    // Flight Operations → Pilot; between Mike (1) and Tom (0), Tom wins on load.
    const pick = suggestAuditor(
      aud({ category: 'Flight Operations' }),
      ROSTER,
      existing,
      2026,
    );
    expect(pick).toEqual({ name: 'Tom Anderson', role: 'Pilot' });
  });

  it('breaks a load tie deterministically by name (alphabetical)', () => {
    // All three Safety auditors at load 0 → alphabetical: Amanda Foster.
    const pick = suggestAuditor(
      aud({ category: 'Safety Management' }),
      ROSTER,
      [],
      2026,
    );
    expect(pick).toEqual({ name: 'Amanda Foster', role: 'Safety' });
  });

  it('falls back to the lightest-loaded auditor overall when no role matches', () => {
    // A category with no mapped role → whole roster is the pool. Give everyone
    // a load except David Brown, who should win.
    const existing = ROSTER.filter(a => a.name !== 'David Brown').map((a, i) =>
      aud({ assignedTo: a.name, scheduledDate: `2026-0${(i % 8) + 1}-01` }),
    );
    const pick = suggestAuditor(
      aud({ category: 'Unmapped Category' }),
      ROSTER,
      existing,
      2026,
    );
    expect(pick).toEqual({ name: 'David Brown', role: 'Maintenance' });
  });

  it('returns null for an empty roster', () => {
    expect(suggestAuditor(aud({}), [], [], 2026)).toBeNull();
  });

  it('shifts the pick when extraLoad marks the natural choice as already handed out', () => {
    // Safety Management → Safety. With everyone at 0, Amanda Foster wins on the
    // alphabetical tie-break. Mark Amanda as already picked once this batch and
    // the next Safety pick moves on (Lisa Chen — next alphabetically at load 0).
    const pick = suggestAuditor(
      aud({ category: 'Safety Management' }),
      ROSTER,
      [],
      2026,
      { 'Amanda Foster': 1 },
    );
    expect(pick).toEqual({ name: 'Lisa Chen', role: 'Safety' });
  });

  it('balances a batch of dateless pool drafts via extraLoad (no repeat auditor)', () => {
    // Two dateless drafts of the same category would otherwise get the identical
    // suggestion, because auditLoadByPerson never counts date-free audits. The
    // batch tally in extraLoad is what keeps them distinct.
    const extraLoad: Record<string, number> = {};
    const picks: string[] = [];
    for (let i = 0; i < 2; i++) {
      const pick = suggestAuditor(
        aud({ category: 'Safety Management', scheduledDate: undefined }),
        ROSTER,
        [],
        2026,
        extraLoad,
      )!;
      picks.push(pick.name);
      extraLoad[pick.name] = (extraLoad[pick.name] || 0) + 1;
    }
    expect(picks).toEqual(['Amanda Foster', 'Lisa Chen']);
  });

  it('maps Ground Operations and Training to their expected roles', () => {
    expect(CATEGORY_ROLE['Ground Operations']).toBe('Maintenance');
    expect(CATEGORY_ROLE['Training']).toBe('Pilot');
  });
});

import { describe, it, expect } from 'vitest';
import type { Doc, DocRevision } from '../types';
import { shipNoteSections, fleetProcedures, cmcRowsByAta } from './shipNotes';
import { SHIP_NOTE_SECTIONS } from '../classes';

const doc = (over: Partial<Doc> & { id: string }): Doc => ({
  classId: 'tribal-knowledge',
  title: over.id,
  category: 'Quirks & field notes',
  roles: ['all'],
  ownerUserId: 'u1',
  ownerName: 'Owner',
  tags: [],
  isPinned: false,
  isArchived: false,
  createdDate: '2026-07-01',
  ...over,
});

const rev = (docId: string, over: Partial<DocRevision> = {}): DocRevision => ({
  id: `${docId}-r1`,
  docId,
  revision: '1.0',
  status: 'published',
  sections: [],
  changeSummary: '',
  effectiveDate: '2026-07-01',
  authorUserId: 'u1',
  authorName: 'Author',
  requireAcknowledgment: false,
  ackLevel: 'none',
  mockChecksum: 'abc',
  fleetTypes: ['G650ER'],
  ...over,
});

describe('shipNoteSections', () => {
  it('groups by category and keeps the configured section order', () => {
    const docs = [
      doc({ id: 'TK-1', category: 'Cabin & connectivity' }),
      doc({ id: 'TK-2', category: 'Messages & faults' }),
      doc({ id: 'TK-3', category: 'Quirks & field notes' }),
    ];
    const revs = [rev('TK-1'), rev('TK-2'), rev('TK-3')];
    const out = shipNoteSections(docs, revs, 'G650ER', ['maintenance']);
    expect(out.map((s) => s.category)).toEqual([...SHIP_NOTE_SECTIONS]);
    expect(out.find((s) => s.category === 'Messages & faults')!.docs.map((d) => d.id)).toEqual(['TK-2']);
  });

  it('marks the reader\'s own sections and expands them, collapsing the rest', () => {
    const docs = [
      doc({ id: 'TK-1', category: 'Cabin & connectivity', roles: ['inflight'] }),
      doc({ id: 'TK-2', category: 'Messages & faults', roles: ['maintenance'] }),
    ];
    const revs = [rev('TK-1'), rev('TK-2')];
    const fa = shipNoteSections(docs, revs, 'G650ER', ['inflight']);
    expect(fa.find((s) => s.category === 'Cabin & connectivity')!.isMine).toBe(true);
    expect(fa.find((s) => s.category === 'Messages & faults')!.isMine).toBe(false);

    const tech = shipNoteSections(docs, revs, 'G650ER', ['maintenance']);
    expect(tech.find((s) => s.category === 'Messages & faults')!.isMine).toBe(true);
    expect(tech.find((s) => s.category === 'Cabin & connectivity')!.isMine).toBe(false);
  });

  it("treats an 'all' audience as everyone's, so shared knowledge is never hidden", () => {
    const docs = [doc({ id: 'TK-1', category: 'Quirks & field notes', roles: ['all'] })];
    const out = shipNoteSections(docs, [rev('TK-1')], 'G650ER', ['inflight']);
    expect(out.find((s) => s.category === 'Quirks & field notes')!.isMine).toBe(true);
  });

  it('never hides another role\'s section — it is present, just not expanded (D64)', () => {
    const docs = [doc({ id: 'TK-2', category: 'Messages & faults', roles: ['maintenance'] })];
    const out = shipNoteSections(docs, [rev('TK-2')], 'G650ER', ['inflight']);
    const mf = out.find((s) => s.category === 'Messages & faults')!;
    expect(mf.docs).toHaveLength(1);
    expect(mf.isMine).toBe(false);
  });

  it('excludes another fleet, and excludes library content that names no fleet at all', () => {
    const docs = [
      doc({ id: 'TK-1', category: 'Quirks & field notes' }),
      doc({ id: 'TK-2', category: 'Quirks & field notes' }),
      doc({ id: 'TK-3', category: 'Airports & FBOs' }),
    ];
    const revs = [
      rev('TK-1', { fleetTypes: ['G500'] }),
      rev('TK-2', { fleetTypes: ['G650ER'] }),
      rev('TK-3', { fleetTypes: undefined }), // KTEB ramp note — library, not a ship note
    ];
    const ids = shipNoteSections(docs, revs, 'G650ER', ['maintenance']).flatMap((s) => s.docs.map((d) => d.id));
    expect(ids).toEqual(['TK-2']);
  });

  it('ignores a draft — an unpublished edit is not yet what the fleet is told', () => {
    const docs = [doc({ id: 'TK-1', category: 'Cabin & connectivity' })];
    const revs = [rev('TK-1', { status: 'draft' })];
    expect(shipNoteSections(docs, revs, 'G650ER', ['inflight']).flatMap((s) => s.docs)).toHaveLength(0);
  });

  it('drops an off-vocabulary category rather than inventing a section for it', () => {
    const docs = [doc({ id: 'TK-9', category: 'Airports & FBOs' })];
    const out = shipNoteSections(docs, [rev('TK-9')], 'G650ER', ['maintenance']);
    expect(out.map((s) => s.category)).toEqual([...SHIP_NOTE_SECTIONS]);
    expect(out.flatMap((s) => s.docs)).toHaveLength(0);
  });
});

describe('fleetProcedures', () => {
  it('returns published SOPs for this fleet — the controlled half of D64\'s split', () => {
    const docs = [
      doc({ id: 'SOP-9', classId: 'sop', title: 'Charts & navigation database load' }),
      doc({ id: 'TK-1' }),
      doc({ id: 'SOP-8', classId: 'sop', title: 'Other fleet' }),
    ];
    const revs = [rev('SOP-9'), rev('TK-1'), rev('SOP-8', { fleetTypes: ['G500'] })];
    expect(fleetProcedures(docs, revs, 'G650ER').map((d) => d.id)).toEqual(['SOP-9']);
  });

  it('does not return an SOP whose current revision is still pending approval', () => {
    const docs = [doc({ id: 'SOP-9', classId: 'sop' })];
    const revs = [rev('SOP-9', { status: 'pending-approval' })];
    expect(fleetProcedures(docs, revs, 'G650ER')).toHaveLength(0);
  });
});

describe('cmcRowsByAta', () => {
  const rows = [
    { messageName: 'COM1-NIM MAC BUS WIRING FAULT', maintCode: '2302031COM1', ataChapter: '23', vendorRefs: ['PR015033'], vendorStatus: 'accepted' as const },
    { messageName: 'SATC-TSC2 TO SDU BUS FAULT', maintCode: '2315011SATC', ataChapter: '23', vendorRefs: ['PR015034'], vendorStatus: 'accepted' as const },
    { messageName: 'SFD1-NO OR INVALID NAVC DATA', maintCode: '3427012SFD1', ataChapter: '34', vendorRefs: ['PR011020'], vendorStatus: 'being-worked' as const },
  ];

  it('groups by ATA chapter in numeric order, with counts', () => {
    const out = cmcRowsByAta(rows, '');
    expect(out.map((g) => g.ataChapter)).toEqual(['23', '34']);
    expect(out.map((g) => g.rows.length)).toEqual([2, 1]);
  });

  it('searches on message name and on maintenance code', () => {
    expect(cmcRowsByAta(rows, 'SATC').flatMap((g) => g.rows).map((r) => r.maintCode)).toEqual(['2315011SATC']);
    expect(cmcRowsByAta(rows, '2315011').flatMap((g) => g.rows)).toHaveLength(1);
  });

  it('is case-insensitive, because nobody types a maintenance code in caps', () => {
    expect(cmcRowsByAta(rows, 'satc').flatMap((g) => g.rows)).toHaveLength(1);
  });

  it('drops empty chapters when a search excludes them all', () => {
    expect(cmcRowsByAta(rows, 'SFD1').map((g) => g.ataChapter)).toEqual(['34']);
  });

  it('returns nothing rather than everything when a search matches no row', () => {
    expect(cmcRowsByAta(rows, 'zzzz')).toEqual([]);
  });
});

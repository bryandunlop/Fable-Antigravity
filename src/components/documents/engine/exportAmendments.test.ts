import { describe, it, expect } from 'vitest';
import type { DocRevision, DocSection } from '../types';
import type { AmendmentResolution } from './amendments';
import { amendedExport, amendmentNoteLine } from './exportAmendments';

const fmt = (iso: string) => iso;

function section(id: string, number: string, title: string, md: string): DocSection {
  return { id, level: 2, number, title, blocks: [{ id: `${id}::b0`, type: 'paragraph', md }] };
}

function manual(): DocRevision {
  return {
    id: 'GOM-001-r14',
    docId: 'GOM-001',
    revision: '14',
    status: 'published',
    sections: [
      section('GOM-001::4-1', '4.1', 'Fuelling — general', 'The PIC retains responsibility.'),
      section('GOM-001::4-2', '4.2', 'Fuelling with passengers aboard', 'One qualified crew member.'),
    ],
    changeSummary: '',
    effectiveDate: '2026-02-01',
    ackLevel: 'initials',
  } as DocRevision;
}

function bulletin(overrides: Partial<DocRevision> = {}): DocRevision {
  return {
    id: 'PB-014-r1',
    docId: 'PB-014',
    revision: '1.0',
    status: 'published',
    sections: [section('PB-014::gov', '', 'Procedure', 'Two qualified crew members.')],
    changeSummary: '',
    effectiveDate: '2026-06-12',
    ackLevel: 'initials',
    amendments: [
      {
        id: 'PB-014-r1::am0',
        targetDocId: 'GOM-001',
        targetSectionId: 'GOM-001::4-2',
        summary: 'Two crew, not one.',
        replacementSectionId: 'PB-014::gov',
      },
    ],
    ...overrides,
  } as DocRevision;
}

describe('amendedExport', () => {
  it('leaves an unamended document byte-identical', () => {
    const rev = manual();
    const out = amendedExport('GOM-001', rev, [rev], []);
    expect(out.sections).toBe(rev.sections);
    expect(out.notes).toEqual([]);
  });

  it('substitutes the governing wording into the amended section', () => {
    const rev = manual();
    const out = amendedExport('GOM-001', rev, [rev, bulletin()], []);
    expect(out.sections[1].blocks[0].md).toBe('Two qualified crew members.');
    expect(out.sections[0].blocks[0].md).toBe('The PIC retains responsibility.');
  });

  it('keeps the manual’s own heading, number and id when substituting', () => {
    // An exported copy that renumbered itself around an amendment would not line
    // up with the copy anyone else is holding.
    const out = amendedExport('GOM-001', manual(), [manual(), bulletin()], []);
    expect(out.sections[1].id).toBe('GOM-001::4-2');
    expect(out.sections[1].number).toBe('4.2');
    expect(out.sections[1].title).toBe('Fuelling with passengers aboard');
  });

  it('keeps the superseded wording available for a document that prints both', () => {
    const out = amendedExport('GOM-001', manual(), [manual(), bulletin()], []);
    expect(out.supersededBySection['GOM-001::4-2'].blocks[0].md).toBe('One qualified crew member.');
  });

  it('writes a front-matter note naming the source, the date and the section', () => {
    const out = amendedExport('GOM-001', manual(), [manual(), bulletin()], []);
    expect(out.notes).toHaveLength(1);
    expect(out.notes[0]).toMatchObject({
      sourceDocId: 'PB-014',
      effectiveDate: '2026-06-12',
      sectionLabel: '4.2 Fuelling with passengers aboard',
      substituted: true,
    });
  });

  it('carries a document-wide amendment in the front matter even though no section changes', () => {
    // It has no anchor, so dropping it would lose it from the export entirely.
    const wide = bulletin({
      amendments: [{ id: 'PB-014-r1::am0', targetDocId: 'GOM-001', summary: 'Applies throughout.' }],
    });
    const out = amendedExport('GOM-001', manual(), [manual(), wide], []);
    expect(out.notes).toHaveLength(1);
    expect(out.notes[0].sectionLabel).toBe('');
    expect(out.notes[0].substituted).toBe(false);
    expect(out.sections[1].blocks[0].md).toBe('One qualified crew member.');
  });

  it('does not substitute when the bulletin restates nothing, but still notes it', () => {
    const noText = bulletin({
      amendments: [
        {
          id: 'PB-014-r1::am0',
          targetDocId: 'GOM-001',
          targetSectionId: 'GOM-001::4-2',
          summary: 'Scope narrowed.',
        },
      ],
    });
    const out = amendedExport('GOM-001', manual(), [manual(), noText], []);
    expect(out.sections[1].blocks[0].md).toBe('One qualified crew member.');
    expect(out.notes[0].substituted).toBe(false);
  });

  it('exports the manual’s own wording once the amendment has been folded in and published', () => {
    const folded: AmendmentResolution[] = [
      { amendmentId: 'PB-014-r1::am0', resolvedInRevisionId: 'GOM-001-r15', resolvedBy: 'U', resolvedOn: '2026-08-22' },
    ];
    const published = { ...manual(), id: 'GOM-001-r15', status: 'published' as const };
    const out = amendedExport('GOM-001', manual(), [manual(), bulletin(), published], folded);
    expect(out.notes).toEqual([]);
    expect(out.sections[1].blocks[0].md).toBe('One qualified crew member.');
  });

  it('the most recently effective amendment governs when two hit one section', () => {
    const older = bulletin({
      id: 'FOB-009-r1',
      docId: 'FOB-009',
      effectiveDate: '2026-03-01',
      sections: [section('FOB-009::gov', '', 'Procedure', 'Older wording.')],
      amendments: [
        {
          id: 'FOB-009-r1::am0',
          targetDocId: 'GOM-001',
          targetSectionId: 'GOM-001::4-2',
          summary: 'Superseded by PB-014.',
          replacementSectionId: 'FOB-009::gov',
        },
      ],
    });
    const out = amendedExport('GOM-001', manual(), [manual(), bulletin(), older], []);
    expect(out.sections[1].blocks[0].md).toBe('Two qualified crew members.');
    // Both still listed — nothing is hidden from the reader of the export.
    expect(out.notes).toHaveLength(2);
    expect(out.notes.filter((n) => n.substituted)).toHaveLength(1);
  });
});

describe('amendmentNoteLine', () => {
  it('reads as one plain sentence that survives a paste into an email', () => {
    const line = amendmentNoteLine(
      {
        sourceDocId: 'PB-014',
        effectiveDate: '2026-06-12',
        summary: 'Two crew, not one.',
        sectionLabel: '4.2 Fuelling with passengers aboard',
        substituted: true,
      },
      fmt,
    );
    expect(line).toBe(
      '§4.2 Fuelling with passengers aboard — amended by PB-014, effective 2026-06-12 (text replaced below). Two crew, not one.',
    );
  });

  it('says where to look when the bulletin restated nothing', () => {
    const line = amendmentNoteLine(
      { sourceDocId: 'FOB-009', effectiveDate: '2026-05-09', summary: 'Scope.', sectionLabel: '', substituted: false },
      fmt,
    );
    expect(line).toContain('Document-wide');
    expect(line).toContain('see the bulletin');
  });
});

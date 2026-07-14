import { describe, it, expect, beforeEach } from 'vitest';
import {
  emptySection, editBlockMd, addBlockAfter, deleteBlock, moveBlock,
  splitBlock, mergeBlockUp, addSection, moveSection, setSectionHeading, deleteSection,
  setBlockComplianceRefs,
} from './blockEditor';
import type { DocSection } from '../types';

let n = 0;
const idGen = () => `nb${++n}`;
beforeEach(() => { n = 0; });

function sections(): DocSection[] {
  return [{
    id: 'D::s1', level: 2, number: '1', title: 'Alpha',
    blocks: [
      { id: 'b1', type: 'paragraph', md: 'First.' },
      { id: 'b2', type: 'paragraph', md: 'Second.' },
    ],
  }];
}

describe('editBlockMd', () => {
  it('updates md and re-types, preserving id', () => {
    const out = editBlockMd(sections(), 'b1', '- one\n- two');
    expect(out[0].blocks[0]).toMatchObject({ id: 'b1', type: 'list', md: '- one\n- two' });
  });
});

describe('addBlockAfter', () => {
  it('inserts a fresh empty paragraph after the target', () => {
    const out = addBlockAfter(sections(), 'b1', idGen);
    expect(out[0].blocks.map((b) => b.id)).toEqual(['b1', 'nb1', 'b2']);
    expect(out[0].blocks[1]).toMatchObject({ type: 'paragraph', md: '' });
  });
});

describe('deleteBlock', () => {
  it('removes a block', () => {
    expect(deleteBlock(sections(), 'b1')[0].blocks.map((b) => b.id)).toEqual(['b2']);
  });
  it('never leaves a section empty', () => {
    const one: DocSection[] = [{ ...sections()[0], blocks: [sections()[0].blocks[0]] }];
    const out = deleteBlock(one, 'b1');
    expect(out[0].blocks).toHaveLength(1);
    expect(out[0].blocks[0].md).toBe('');
  });
});

describe('moveBlock', () => {
  it('swaps down and is a no-op at the edge', () => {
    expect(moveBlock(sections(), 'b1', 'down')[0].blocks.map((b) => b.id)).toEqual(['b2', 'b1']);
    expect(moveBlock(sections(), 'b1', 'up')[0].blocks.map((b) => b.id)).toEqual(['b1', 'b2']);
  });
});

describe('splitBlock', () => {
  it('sets splitFrom on the new trailing block', () => {
    const out = splitBlock(sections(), 'b1', 'First part.', 'Second part.', idGen);
    expect(out[0].blocks[0]).toMatchObject({ id: 'b1', md: 'First part.' });
    expect(out[0].blocks[1]).toMatchObject({ id: 'nb1', md: 'Second part.', splitFrom: 'b1' });
    expect(out[0].blocks[2].id).toBe('b2');
  });
});

describe('mergeBlockUp', () => {
  it('merges into the previous block keeping its id', () => {
    const out = mergeBlockUp(sections(), 'b2');
    expect(out[0].blocks).toHaveLength(1);
    expect(out[0].blocks[0]).toMatchObject({ id: 'b1', md: 'First.\n\nSecond.' });
  });
  it('is a no-op for the first block', () => {
    expect(mergeBlockUp(sections(), 'b1')[0].blocks).toHaveLength(2);
  });
});

describe('sections', () => {
  it('adds, moves, renumbers/retitles (id stable), deletes', () => {
    const two = addSection(sections(), 'D::s1', idGen);
    expect(two).toHaveLength(2);
    const moved = moveSection(two, two[1].id, 'up');
    expect(moved[0].id).toBe(two[1].id);
    const titled = setSectionHeading(sections(), 'D::s1', '2', 'Bravo');
    expect(titled[0]).toMatchObject({ id: 'D::s1', number: '2', title: 'Bravo' });
    expect(deleteSection(sections(), 'D::s1')).toHaveLength(1); // only section → no-op
  });
});

describe('emptySection', () => {
  it('has one empty paragraph', () => {
    const s = emptySection(idGen);
    expect(s.blocks).toHaveLength(1);
    expect(s.blocks[0].md).toBe('');
  });
});

describe('setBlockComplianceRefs', () => {
  it('sets refs on the block, and clears when empty', () => {
    const set = setBlockComplianceRefs(sections(), 'b1', ['far-91-175', 'opspec-c074']);
    expect(set[0].blocks[0].complianceRefs).toEqual(['far-91-175', 'opspec-c074']);
    const cleared = setBlockComplianceRefs(set, 'b1', []);
    expect(cleared[0].blocks[0].complianceRefs).toBeUndefined();
  });
});

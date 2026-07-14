// Pure, immutable structured-editor operations over DocSection[]. IDs are
// editor-maintained (preserved through edits; fresh IDs for new blocks) so
// revision diffs stay precise. No React / no storage.
import type { DocSection, DocBlock } from '../types';
import { classifyBlockMd } from './blocks';

const defaultIdGen = (): string => crypto.randomUUID().slice(0, 8);

function typed(md: string, base: Pick<DocBlock, 'id'> & Partial<DocBlock>): DocBlock {
  const c = classifyBlockMd(md);
  const block: DocBlock = { id: base.id, type: c.type, md };
  if (c.calloutKind) block.calloutKind = c.calloutKind;
  if (c.figureRef) block.figureRef = c.figureRef;
  if (base.splitFrom) block.splitFrom = base.splitFrom;
  if (base.effectivity) block.effectivity = base.effectivity;
  return block;
}

function freshBlock(idGen: () => string, md = '', splitFrom?: string): DocBlock {
  const b = typed(md, { id: idGen() });
  return splitFrom ? { ...b, splitFrom } : b;
}

const mapSectionOf = (sections: DocSection[], blockId: string, fn: (s: DocSection) => DocSection): DocSection[] =>
  sections.map((s) => (s.blocks.some((b) => b.id === blockId) ? fn(s) : s));

export function emptySection(idGen: () => string = defaultIdGen): DocSection {
  return { id: `sec-${idGen()}`, level: 2, number: '', title: '', blocks: [freshBlock(idGen)] };
}

export function editBlockMd(sections: DocSection[], blockId: string, md: string): DocSection[] {
  return mapSectionOf(sections, blockId, (s) => ({
    ...s,
    blocks: s.blocks.map((b) => (b.id === blockId ? typed(md, b) : b)),
  }));
}

export function addBlockAfter(sections: DocSection[], blockId: string, idGen: () => string = defaultIdGen): DocSection[] {
  return mapSectionOf(sections, blockId, (s) => {
    const i = s.blocks.findIndex((b) => b.id === blockId);
    const blocks = [...s.blocks];
    blocks.splice(i + 1, 0, freshBlock(idGen));
    return { ...s, blocks };
  });
}

export function deleteBlock(sections: DocSection[], blockId: string): DocSection[] {
  return mapSectionOf(sections, blockId, (s) => {
    const blocks = s.blocks.filter((b) => b.id !== blockId);
    return { ...s, blocks: blocks.length ? blocks : [freshBlock(defaultIdGen)] };
  });
}

export function moveBlock(sections: DocSection[], blockId: string, dir: 'up' | 'down'): DocSection[] {
  return mapSectionOf(sections, blockId, (s) => {
    const i = s.blocks.findIndex((b) => b.id === blockId);
    const j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= s.blocks.length) return s;
    const blocks = [...s.blocks];
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
    return { ...s, blocks };
  });
}

export function splitBlock(
  sections: DocSection[], blockId: string, caretMd: string, restMd: string, idGen: () => string = defaultIdGen,
): DocSection[] {
  return mapSectionOf(sections, blockId, (s) => {
    const i = s.blocks.findIndex((b) => b.id === blockId);
    const head = typed(caretMd, s.blocks[i]);
    const tail = freshBlock(idGen, restMd, blockId);
    const blocks = [...s.blocks];
    blocks.splice(i, 1, head, tail);
    return { ...s, blocks };
  });
}

export function mergeBlockUp(sections: DocSection[], blockId: string): DocSection[] {
  return mapSectionOf(sections, blockId, (s) => {
    const i = s.blocks.findIndex((b) => b.id === blockId);
    if (i <= 0) return s;
    const prev = s.blocks[i - 1];
    const merged = typed(`${prev.md}\n\n${s.blocks[i].md}`.trim(), prev);
    const blocks = [...s.blocks];
    blocks.splice(i - 1, 2, merged);
    return { ...s, blocks };
  });
}

export function addSection(sections: DocSection[], afterSectionId: string, idGen: () => string = defaultIdGen): DocSection[] {
  const i = sections.findIndex((s) => s.id === afterSectionId);
  const out = [...sections];
  out.splice(i + 1, 0, emptySection(idGen));
  return out;
}

export function moveSection(sections: DocSection[], sectionId: string, dir: 'up' | 'down'): DocSection[] {
  const i = sections.findIndex((s) => s.id === sectionId);
  const j = dir === 'up' ? i - 1 : i + 1;
  if (j < 0 || j >= sections.length) return sections;
  const out = [...sections];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

export function setSectionHeading(sections: DocSection[], sectionId: string, number: string, title: string): DocSection[] {
  return sections.map((s) => (s.id === sectionId ? { ...s, number, title } : s));
}

/** G1: set the regulation-requirement ids a block satisfies (empty ⇒ cleared). */
export function setBlockComplianceRefs(sections: DocSection[], blockId: string, refs: string[]): DocSection[] {
  return mapSectionOf(sections, blockId, (s) => ({
    ...s,
    blocks: s.blocks.map((b) => (b.id === blockId ? { ...b, complianceRefs: refs.length ? refs : undefined } : b)),
  }));
}

export function deleteSection(sections: DocSection[], sectionId: string): DocSection[] {
  if (sections.length <= 1) return sections;
  return sections.filter((s) => s.id !== sectionId);
}

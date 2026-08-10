// Pure, immutable structured-editor operations over DocSection[]. IDs are
// editor-maintained (preserved through edits; fresh IDs for new blocks) so
// revision diffs stay precise. No React / no storage.
import type { DocSection, DocBlock, DocSuggestion } from '../types';
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

/**
 * Stage a reader's proposal as a NEW block directly after the block it was filed
 * against, marked so `validateSubmit` refuses the revision until a maintainer
 * works it into real document wording.
 *
 * It is a new block, never a rewrite of the anchor. `proposedChange` is free
 * text — usually a DESCRIPTION of a change ("add a gusty crosswind note"), not
 * replacement wording — so writing it over approved text would put a reader's
 * prose into a controlled document under the previous author's name.
 *
 * When the anchor is missing (no `blockId`, or the block was deleted in a later
 * revision) the staged block is APPENDED to the last section rather than
 * dropped. Silently losing a reader's words is the failure this whole flow
 * exists to fix; a mis-placed block a maintainer must move is the lesser harm.
 */
export function stageSuggestion(
  sections: DocSection[],
  sug: Pick<DocSuggestion, 'id' | 'blockId' | 'proposedChange' | 'authorName'>,
  newBlockId: string,
): DocSection[] {
  const staged: DocBlock = {
    ...typed(sug.proposedChange, { id: newBlockId }),
    stagedFromSuggestionId: sug.id,
  };
  const anchorExists = !!sug.blockId && sections.some((s) => s.blocks.some((b) => b.id === sug.blockId));
  if (!anchorExists) {
    if (sections.length === 0) {
      return [{ id: `sec-${newBlockId}`, level: 2, number: '', title: '', blocks: [staged] }];
    }
    return sections.map((s, i) =>
      i === sections.length - 1 ? { ...s, blocks: [...s.blocks, staged] } : s,
    );
  }
  return mapSectionOf(sections, sug.blockId!, (s) => {
    const i = s.blocks.findIndex((b) => b.id === sug.blockId);
    const blocks = [...s.blocks];
    blocks.splice(i + 1, 0, staged);
    return { ...s, blocks };
  });
}

/**
 * The maintainer has accepted this block's wording as document text — clear the
 * mark so the revision can be submitted.
 *
 * Editing the block through `editBlockMd` clears it too (the mark is not carried
 * by `typed`), which is the usual path. This is the "it already reads correctly,
 * take it as written" path.
 */
export function clearStagedMark(sections: DocSection[], blockId: string): DocSection[] {
  return mapSectionOf(sections, blockId, (s) => ({
    ...s,
    blocks: s.blocks.map((b) => {
      if (b.id !== blockId || !b.stagedFromSuggestionId) return b;
      const { stagedFromSuggestionId: _cleared, ...rest } = b;
      return rest;
    }),
  }));
}

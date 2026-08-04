import { describe, it, expect } from 'vitest';
import {
  stepFormFromSections, stepFormToSections, stepFormToMarkdown, emptyStepFormModel, looksLikeStepForm,
} from './stepForm';
import { sectionsFromMarkdown, stepNumbers, checksumForSections } from './blocks';

const DOC = 'CK-001';

describe('stepForm — the semi-rigid form is a projection over the block model', () => {
  it('writes steps as ordinary step blocks the existing classifier understands', () => {
    const sections = stepFormToSections(
      {
        steps: [
          { key: 'a', text: 'Recline the divan fully.', photo: '/img/divan-flat.jpg' },
          { key: 'b', text: 'Fit the aft sheet corners first.' },
        ],
        caution: 'Do not stow the cushions in the aft baggage.',
      },
      DOC,
    );
    const blocks = sections.flatMap((s) => s.blocks);
    expect(blocks.map((b) => b.type)).toEqual(['step', 'step', 'callout']);
    expect(blocks[0].figureRef).toBe('/img/divan-flat.jpg');
    expect(blocks[2].calloutKind).toBe('caution');
    // Numbering comes from the shared engine, not from the form.
    expect([...stepNumbers(blocks).values()]).toEqual([1, 2]);
  });

  it('round-trips a document it authored, text and photo intact', () => {
    const model = {
      steps: [
        { key: 'a', text: 'Hold the cabin-light master for five seconds.', photo: '/img/master.png' },
        { key: 'b', text: 'Wait for the galley strip to blink twice.' },
      ],
      caution: 'Never cycle this in flight with passengers seated aft.',
    };
    const { model: back, lossy } = stepFormFromSections(stepFormToSections(model, DOC));
    expect(lossy).toBe(false);
    expect(back.steps.map((s) => s.text)).toEqual(model.steps.map((s) => s.text));
    expect(back.steps.map((s) => s.photo)).toEqual(['/img/master.png', undefined]);
    expect(back.caution).toBe(model.caution);
  });

  it('flags a document holding content the form cannot represent, rather than eating it', () => {
    const sections = sectionsFromMarkdown(
      '[!STEP] Do the thing.\n\n| a | b |\n| --- | --- |\n| 1 | 2 |',
      DOC,
    );
    expect(stepFormFromSections(sections).lossy).toBe(true);
  });

  it('treats a headed section as beyond the form', () => {
    expect(stepFormFromSections(sectionsFromMarkdown('## 2 Bedding\n\n[!STEP] Go.', DOC)).lossy).toBe(true);
  });

  it('drops blank step rows instead of emitting empty steps', () => {
    const sections = stepFormToSections(
      { steps: [{ key: 'a', text: 'Only real step.' }, { key: 'b', text: '   ' }], caution: '' },
      DOC,
    );
    expect(sections.flatMap((s) => s.blocks).filter((b) => b.type === 'step')).toHaveLength(1);
  });

  it('produces an empty tree for an empty form, so the dialog can reject it as no content', () => {
    expect(stepFormToSections(emptyStepFormModel(), DOC).flatMap((s) => s.blocks)).toHaveLength(0);
  });

  it('keeps a multi-line caution inside the callout', () => {
    const md = stepFormToMarkdown({ steps: [], caution: 'First line.\nSecond line.' });
    expect(md).toBe('> [!CAUTION] First line.\n> Second line.');
    const { model } = stepFormFromSections(sectionsFromMarkdown(md, DOC));
    expect(model.caution).toBe('First line.\nSecond line.');
  });

  it('leaves the canonical checksum shape unchanged — form output hashes like any other tree', () => {
    const viaForm = stepFormToSections({ steps: [{ key: 'a', text: 'Go.' }], caution: '' }, DOC);
    const viaMarkdown = sectionsFromMarkdown('[!STEP] Go.', DOC);
    expect(checksumForSections(viaForm)).toBe(checksumForSections(viaMarkdown));
  });

  it('recognises step markdown so an imported entry can offer the form', () => {
    expect(looksLikeStepForm('[!STEP] Do it.')).toBe(true);
    expect(looksLikeStepForm('Just a paragraph.')).toBe(false);
  });
});

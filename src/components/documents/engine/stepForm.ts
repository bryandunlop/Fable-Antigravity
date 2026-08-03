// D75 — the semi-rigid step form, as a pure projection over the EXISTING block model.
//
// The form is a VIEW, not a second content model. It reads a `DocSection[]` into a small
// flat shape (numbered steps, each with one optional photo, plus one optional caution) and
// writes that shape back out as ordinary markdown, which `sectionsFromMarkdown` classifies
// into the same `step` / `figure` / `callout` blocks any other author would produce. That is
// what lets the reader, search, revision diff, print and the .docx export keep working with
// no changes at all — and why the canonical checksum shape is untouched (D64).
//
// The form is deliberately LOSSY-AWARE rather than lossy: `stepFormFromSections` reports
// when a document holds content the form cannot represent, so the caller can fall back to
// the full editor instead of silently deleting someone's table.
import type { DocSection, DocBlock } from '../types';
import { sectionsFromMarkdown, stepBody, STEP_MARKER } from './blocks';

export interface StepFormStep {
  /** Block id when the step came from an existing document; a synthetic key for a new row.
   *  Used as a React key only — block identity is re-derived on serialize, exactly as the
   *  markdown editor's is. */
  key: string;
  text: string;
  /** Image src. One photo per step is the rigid part of "semi-rigid": a step with three
   *  photos is a step that should have been three steps. */
  photo?: string;
}

export interface StepFormModel {
  steps: StepFormStep[];
  /** The single optional caution rendered after the steps. Empty string = no caution. */
  caution: string;
}

const IMAGE_LINE = /^!\[[^\]]*\]\(([^)]+)\)$/;
const CALLOUT_PREFIX = /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i;

export function emptyStepFormModel(): StepFormModel {
  return { steps: [{ key: 'step-0', text: '' }], caution: '' };
}

/** The instruction text of a step block, with the marker AND any photo line removed.
 *  `stepBody` only strips the marker — the photo rides in `md` so the block round-trips
 *  through markdown, which means the form has to take it off again for the text input. */
function instructionOf(block: DocBlock): string {
  return stepBody(block.md)
    .split('\n')
    .filter((line) => !IMAGE_LINE.test(line.trim()))
    .join('\n')
    .trim();
}

function calloutTextOf(block: DocBlock): string {
  return block.md
    .split('\n')
    .map((line, i) => (i === 0 ? line.replace(CALLOUT_PREFIX, '') : line.replace(/^>\s?/, '')))
    .join('\n')
    .trim();
}

/**
 * Read an existing document into the form's shape.
 *
 * `lossy` is true when the document holds anything the form cannot round-trip — a table, a
 * list, a second section, a plain paragraph, or more than one callout. The caller must not
 * open the form on a lossy document: saving would silently drop that content, and this
 * module has no way to put it back.
 */
export function stepFormFromSections(sections: DocSection[]): { model: StepFormModel; lossy: boolean } {
  const steps: StepFormStep[] = [];
  let caution = '';
  let lossy = false;

  if (sections.some((s) => s.title.trim() || s.number.trim())) lossy = true;

  const blocks = sections.flatMap((s) => s.blocks);
  for (const block of blocks) {
    if (!block.md.trim()) continue;
    if (block.type === 'step') {
      steps.push({ key: block.id, text: instructionOf(block), photo: block.figureRef });
      continue;
    }
    if (block.type === 'callout' && !caution) {
      caution = calloutTextOf(block);
      continue;
    }
    lossy = true;
  }

  return {
    model: steps.length ? { steps, caution } : { ...emptyStepFormModel(), caution },
    lossy,
  };
}

/** The form's markdown. Exported for the test and for anything that wants the source text. */
export function stepFormToMarkdown(model: StepFormModel): string {
  const chunks = model.steps
    .filter((s) => s.text.trim() || s.photo)
    .map((s) => {
      const head = `[!STEP] ${s.text.trim()}`;
      return s.photo ? `${head}\n![](${s.photo})` : head;
    });
  const caution = model.caution.trim();
  if (caution) chunks.push(`> [!CAUTION] ${caution.replace(/\n/g, '\n> ')}`);
  return chunks.join('\n\n');
}

/** Write the form back out as the ordinary block tree. Same parser every other author hits. */
export function stepFormToSections(model: StepFormModel, docId: string): DocSection[] {
  return sectionsFromMarkdown(stepFormToMarkdown(model), docId);
}

/** Does this markdown already use the step marker? Used to offer the form on import. */
export function looksLikeStepForm(markdown: string): boolean {
  return markdown.split('\n').some((line) => STEP_MARKER.test(line.trim()));
}

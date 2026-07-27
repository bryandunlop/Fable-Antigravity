// LG-55 — static audit of Radix dialog/sheet description wiring.
//
// Radix's DescriptionWarning (@radix-ui/react-dialog dist/index.mjs) fires when
// the content node carries a non-empty `aria-describedby` but `context.descriptionId`
// — the id Radix generated for itself — is not in the DOM:
//
//     const describedById = contentRef.current?.getAttribute('aria-describedby');
//     if (descriptionId && describedById) {
//       if (!document.getElementById(descriptionId)) console.warn(MESSAGE);
//     }
//
// Two things follow, and the second is the one that bites:
//
//  1. Rendering no `<DialogDescription>` warns. Obvious.
//  2. Rendering a `<DialogDescription id="my-id">` ALSO warns — the hand-written
//     id replaces Radix's generated one, so the element Radix looks for never
//     exists. Screen readers are fine; the console is not. This is why the noise
//     looked universal when most dialogs were in fact correctly described.
//
// The only clean opt-out is `aria-describedby={undefined}` on the content, which
// removes the attribute and short-circuits the check. It must be passed per call
// site: Radix sets `aria-describedby={context.descriptionId}` and only then
// spreads caller props, and JS cannot tell an absent key from an explicit
// `undefined` — so a wrapper-level default would strip the attribute from every
// correctly-described dialog in the app, silencing the console by breaking the
// very association it is warning about.
//
// A static scan rather than a render test: mounting all ~180 dialogs would need
// each one's page, data and role context, and this catches the problem the
// moment it is typed instead.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Content components built on @radix-ui/react-dialog, with their description partner. */
export const DESCRIBED_PAIRS: ReadonlyArray<readonly [content: string, description: string]> = [
  ['DialogContent', 'DialogDescription'],
  ['SheetContent', 'SheetDescription'],
  ['AlertDialogContent', 'AlertDialogDescription'],
  ['DrawerContent', 'DrawerDescription'],
];

/**
 * Files whose dialog header is built in a helper rather than inline in the JSX,
 * so a literal scan of the content block cannot see it. Each entry names why —
 * same discipline as DYNAMIC_LINK_SOURCES in notifications/linkAudit.test.ts.
 *
 * An entry only exempts a file that still contains the description component
 * somewhere, so deleting the description un-exempts the file rather than
 * silently keeping it green.
 */
export const INDIRECT_HEADERS: Record<string, string> = {
  'src/components/ProposalSubmissionFlow.tsx':
    'One dialog, four wizard steps: getStepContent() returns a DialogHeader with a title and description per step.',
  'src/components/MyFRATSubmissions.tsx':
    'List and grid views share renderSubmissionDialogContent(submission), which carries the DialogHeader for both.',
};

export type DialogBlock = {
  file: string;
  line: number;
  tag: string;
  /** A `<XDescription` appears somewhere inside the content block. */
  hasDescription: boolean;
  /** That description hand-writes an `id`, displacing Radix's generated one. */
  descriptionHasOwnId: boolean;
  /** The content's own `aria-describedby={undefined}` — Radix's documented opt-out. */
  optsOut: boolean;
};

/** Index just past the `>` of the JSX opening tag starting at `from`, quote-aware. */
function endOfOpeningTag(source: string, from: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = from; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) return i + 1;
  }
  return source.length;
}

/**
 * Every content block in one file, paired with the facts that decide whether
 * Radix will warn. Nesting-aware: a dialog rendered inside another dialog's
 * block gets its own entry rather than borrowing the outer one's description.
 */
export function findDialogBlocks(source: string, file: string): DialogBlock[] {
  const blocks: DialogBlock[] = [];

  for (const [tag, description] of DESCRIBED_PAIRS) {
    const opening = new RegExp(`<${tag}(?=[\\s/>])`, 'g');
    let match: RegExpExecArray | null;

    while ((match = opening.exec(source))) {
      const openEnd = endOfOpeningTag(source, match.index);
      const openTag = source.slice(match.index, openEnd);

      // Walk to the matching close tag, counting same-name nesting.
      const boundary = new RegExp(`<${tag}(?=[\\s/>])|</${tag}>`, 'g');
      boundary.lastIndex = match.index;
      let depth = 0;
      let end = source.length;
      let hit: RegExpExecArray | null;
      while ((hit = boundary.exec(source))) {
        if (hit[0].startsWith('</')) {
          if (--depth === 0) {
            end = hit.index;
            break;
          }
        } else depth++;
      }

      const body = source.slice(openEnd, end);
      const descOpen = new RegExp(`<${description}(?=[\\s/>])`).exec(body);
      const descTag = descOpen ? body.slice(descOpen.index, endOfOpeningTag(body, descOpen.index)) : '';

      // A helper-built header is invisible to a literal scan of the block, so an
      // INDIRECT_HEADERS file counts its description wherever in the file it sits.
      const indirect = file in INDIRECT_HEADERS && new RegExp(`<${description}(?=[\\s/>])`).test(source);

      blocks.push({
        file,
        line: source.slice(0, match.index).split('\n').length,
        tag,
        hasDescription: descOpen !== null || indirect,
        descriptionHasOwnId: /\sid\s*=/.test(descTag),
        optsOut: /\saria-describedby\s*=\s*\{\s*undefined\s*\}/.test(openTag),
      });
    }
  }

  return blocks.sort((a, b) => a.line - b.line);
}

/**
 * Why Radix will warn about this block, or null if it will stay quiet.
 * Mirrors DescriptionWarning exactly — nothing here is a style preference.
 */
export function warningReason(block: DialogBlock): string | null {
  if (block.optsOut) return null;
  if (!block.hasDescription) {
    return `<${block.tag}> renders no description. Add the matching <…Description>, ` +
      `or opt out with aria-describedby={undefined} if it genuinely has nothing to say.`;
  }
  if (block.descriptionHasOwnId) {
    return `<${block.tag}>'s description hand-writes an id, which displaces the id Radix ` +
      `generated and looks for. Drop the id (and any matching aria-describedby) and let Radix wire it.`;
  }
  return null;
}

/** Every .tsx under `dir`, recursively. */
export function collectTsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return collectTsxFiles(full);
    return full.endsWith('.tsx') ? [full] : [];
  });
}

/** Every content block across the tree, in file order. */
export function auditTree(root = 'src'): DialogBlock[] {
  return collectTsxFiles(root).sort().flatMap((file) =>
    findDialogBlocks(readFileSync(file, 'utf8'), file),
  );
}

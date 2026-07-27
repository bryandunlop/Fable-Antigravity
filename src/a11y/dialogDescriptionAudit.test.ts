// LG-55 — the guard that stops the 48th undescribed dialog.
//
// Sibling of LG-30, which fixed the missing-DialogTitle *errors*. Radix treats a
// missing Description as a warning instead, so it never broke a build and 47 of
// 178 content blocks accumulated without one. See dialogDescriptionAudit.ts for
// the exact Radix mechanism this mirrors.
//
// No exemption list on purpose: the tree was brought to zero before this landed,
// so anything it reports is new.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { auditTree, findDialogBlocks, warningReason, DESCRIBED_PAIRS, INDIRECT_HEADERS } from './dialogDescriptionAudit';

describe('every Radix dialog/sheet is described or explicitly opts out', () => {
  const blocks = auditTree('src');

  // Guards against this suite quietly becoming decorative: a scanner that
  // matches nothing passes the assertion below having checked nothing at all.
  it('finds content blocks to audit', () => {
    expect(blocks.length).toBeGreaterThan(100);
    for (const [tag] of DESCRIBED_PAIRS.slice(0, 2)) {
      expect(blocks.some((b) => b.tag === tag), `no <${tag}> blocks found — has the design system moved?`).toBe(true);
    }
  });

  it('no block will trip Radix DescriptionWarning', () => {
    const offenders = blocks
      .map((b) => ({ b, reason: warningReason(b) }))
      .filter((x): x is { b: typeof blocks[number]; reason: string } => x.reason !== null)
      .map(({ b, reason }) => `${b.file}:${b.line} — ${reason}`);

    expect(offenders, `${offenders.length} dialog(s) will log to the console on open:\n${offenders.join('\n')}`)
      .toEqual([]);
  });

  // An exemption that outlives the indirection it was granted for is how a guard
  // rots into decoration: the file would keep passing with no description at all.
  it.each(Object.entries(INDIRECT_HEADERS))('%s still builds a description indirectly', (file) => {
    const source = readFileSync(file, 'utf8');
    expect(/<\w*Description(?=[\s/>])/.test(source), `${file} is exempt but has no description left — drop the INDIRECT_HEADERS entry`).toBe(true);
    expect(/=>|function/.test(source), `${file} is exempt for a helper-built header but has no helper`).toBe(true);
  });
});

// The scanner itself, against the three shapes that actually occur. Without
// these, a regex slip that made findDialogBlocks match nothing would read as a
// clean tree.
describe('findDialogBlocks', () => {
  it('flags a content block with no description', () => {
    const [block] = findDialogBlocks('<DialogContent><DialogTitle>Hi</DialogTitle></DialogContent>', 'x.tsx');
    expect(block.hasDescription).toBe(false);
    expect(warningReason(block)).toMatch(/renders no description/);
  });

  it('accepts a plain description', () => {
    const [block] = findDialogBlocks(
      '<DialogContent><DialogTitle>Hi</DialogTitle><DialogDescription>Why</DialogDescription></DialogContent>',
      'x.tsx',
    );
    expect(block.hasDescription).toBe(true);
    expect(warningReason(block)).toBeNull();
  });

  it('flags a description that hand-writes an id, which Radix cannot find', () => {
    const [block] = findDialogBlocks(
      '<DialogContent aria-describedby="mine"><DialogDescription id="mine">Why</DialogDescription></DialogContent>',
      'x.tsx',
    );
    expect(block.descriptionHasOwnId).toBe(true);
    expect(warningReason(block)).toMatch(/hand-writes an id/);
  });

  // A block can hold one description per branch of a conditional. Checking only
  // the first would let an id on any later one slip through.
  it('flags a multi-description block only when EVERY description hand-writes an id', () => {
    const oneClean = findDialogBlocks(
      '<DialogContent><DialogDescription id="a">A</DialogDescription>' +
      '<DialogDescription>B</DialogDescription></DialogContent>',
      'x.tsx',
    );
    expect(warningReason(oneClean[0])).toBeNull();

    const allOwnIds = findDialogBlocks(
      '<DialogContent><DialogDescription id="a">A</DialogDescription>' +
      '<DialogDescription id="b">B</DialogDescription></DialogContent>',
      'x.tsx',
    );
    expect(warningReason(allOwnIds[0])).toMatch(/hand-writes an id/);
  });

  it('does not let a self-closing content tag consume a later block\'s close tag', () => {
    const blocks = findDialogBlocks(
      '<DialogContent />\n<DialogContent><DialogDescription>Why</DialogDescription></DialogContent>',
      'x.tsx',
    );
    expect(blocks).toHaveLength(2);
    expect(blocks.map((b) => b.hasDescription)).toEqual([false, true]);
  });

  it('accepts the aria-describedby={undefined} opt-out', () => {
    const [block] = findDialogBlocks('<DialogContent aria-describedby={undefined}><p /></DialogContent>', 'x.tsx');
    expect(block.optsOut).toBe(true);
    expect(warningReason(block)).toBeNull();
  });

  it('gives a nested dialog its own verdict rather than the outer one\'s description', () => {
    const blocks = findDialogBlocks(
      '<DialogContent><DialogDescription>Outer</DialogDescription>' +
      '<DialogContent><DialogTitle>Inner</DialogTitle></DialogContent></DialogContent>',
      'x.tsx',
    );
    expect(blocks).toHaveLength(2);
    expect(blocks.map((b) => b.hasDescription)).toEqual([true, false]);
  });

  it('does not mistake an attribute value for the end of the opening tag', () => {
    const [block] = findDialogBlocks(
      '<DialogContent className={cn("a>b", x)} aria-describedby={undefined}><p /></DialogContent>',
      'x.tsx',
    );
    expect(block.optsOut).toBe(true);
  });
});

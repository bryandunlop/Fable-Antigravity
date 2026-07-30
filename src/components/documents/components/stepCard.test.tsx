import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { sectionsFromMarkdown } from '../engine/blocks';
import { SectionedContent } from './SectionedContent';

/** Bryan's own example (D64 amendment): a title, then steps with a photo and a note per step. */
const WIFI = [
  '## Reset the cabin wifi',
  '',
  '[!STEP] Open the aft left cabinet and locate the CMS router panel.',
  '![router panel](/img/n1pg-router.jpg)',
  '',
  '[!STEP] Hold the reset pin for 10 seconds until the amber light blinks twice.',
  '',
  '> [!CAUTION]',
  '> A shorter press reboots without clearing the stored password.',
  '',
  '[!STEP] Rejoin from a phone to confirm, then update the galley password card.',
].join('\n');

const stepNumbersOnScreen = (c: HTMLElement) =>
  Array.from(c.querySelectorAll('[data-step]')).map((el) => el.getAttribute('data-step'));

describe('step cards', () => {
  it('numbers the steps and never shows the raw marker to a reader', () => {
    const { container } = render(<SectionedContent sections={sectionsFromMarkdown(WIFI, 'TK-9')} />);
    expect(stepNumbersOnScreen(container)).toEqual(['1', '2', '3']);
    expect(container.textContent).not.toContain('[!STEP]');
    expect(screen.getByText(/locate the CMS router panel/)).toBeTruthy();
  });

  it('renders the step photo inline with its instruction', () => {
    const { container } = render(<SectionedContent sections={sectionsFromMarkdown(WIFI, 'TK-9')} />);
    const img = container.querySelector('img[src="/img/n1pg-router.jpg"]');
    expect(img).toBeTruthy();
    expect(img!.closest('[data-step]')?.getAttribute('data-step')).toBe('1');
  });

  it('does not let a note between two steps consume a step number', () => {
    const { container } = render(<SectionedContent sections={sectionsFromMarkdown(WIFI, 'TK-9')} />);
    expect(container.querySelectorAll('[data-step]')).toHaveLength(3);
    expect(screen.getByText(/without clearing the stored password/)).toBeTruthy();
  });

  it('renumbers when a middle step is removed, with no author action', () => {
    const [section] = sectionsFromMarkdown(WIFI, 'TK-9');
    const steps = section.blocks.filter((b) => b.type === 'step');
    const trimmed = [{ ...section, blocks: section.blocks.filter((b) => b.id !== steps[1].id) }];
    const { container } = render(<SectionedContent sections={trimmed} />);
    expect(stepNumbersOnScreen(container)).toEqual(['1', '2']);
    expect(container.textContent).toContain('update the galley password card');
  });

  it('restarts numbering per section, so two task cards in one doc both start at 1', () => {
    const two = `${WIFI}\n\n## Set up a bed\n\n[!STEP] Recline the divan.\n\n[!STEP] Fit the mattress pad.`;
    const { container } = render(<SectionedContent sections={sectionsFromMarkdown(two, 'TK-9')} />);
    expect(stepNumbersOnScreen(container)).toEqual(['1', '2', '3', '1', '2']);
  });

  it('announces the step number to a screen reader, not just as a visual badge', () => {
    render(<SectionedContent sections={sectionsFromMarkdown(WIFI, 'TK-9')} />);
    expect(screen.getByText('Step 2.')).toBeTruthy();
  });
});

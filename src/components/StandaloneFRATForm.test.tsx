import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StandaloneFRATForm from './StandaloneFRATForm';

// A FRAT is filled on an iPad, standing at the aircraft, and tapped dozens of
// times per fill. These pin the parts of that which are easy to break silently:
// the size of the target, and whether the target is a real control at all.

const renderFrat = () =>
  render(
    <MemoryRouter>
      <StandaloneFRATForm />
    </MemoryRouter>,
  );

const sectionToggle = (name: RegExp) => screen.getByRole('button', { expanded: false, name });

describe('StandaloneFRATForm', () => {
  it('makes each section a real button, not a click handler on a header', () => {
    renderFrat();
    const toggle = sectionToggle(/Pilot Qualifications/);
    expect(toggle.tagName).toBe('BUTTON');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText(/PIC with less than 200 flight hours/)).toBeTruthy();
  });

  it('scores a factor when the row is tapped, not only the 16px checkbox glyph', () => {
    renderFrat();
    fireEvent.click(sectionToggle(/Pilot Qualifications/));

    expect(screen.getByText(/Current Risk Score: 0/)).toBeTruthy();

    // The whole row is a <label> for the checkbox, so a tap anywhere on it counts.
    const row = screen.getByText(/PIC with less than 200 flight hours/).closest('label');
    expect(row).toBeTruthy();
    expect(within(row!).getByRole('checkbox')).toBeTruthy();

    fireEvent.click(row!);
    expect(screen.getByText(/Current Risk Score: 2/)).toBeTruthy();
  });

  it('does not add its own page padding — the layout shell already applies p-6', () => {
    const { container } = renderFrat();
    const page = container.querySelector('.max-w-4xl');
    expect(page).toBeTruthy();
    expect(page!.className).not.toMatch(/(^|\s)p-6(\s|$)/);
  });

  it('pairs the factors on the CONTAINER width, never the viewport', () => {
    const { container } = renderFrat();
    fireEvent.click(sectionToggle(/Pilot Qualifications/));

    // by content, not by `.grid` — CardHeader is itself a grid
    const grid = [...container.querySelectorAll('div.grid')].find((el) =>
      el.querySelector('[role="checkbox"]'),
    );
    expect(grid).toBeTruthy();
    // A viewport breakpoint here would put two 265pt columns into the 570pt this
    // column actually has on an 834pt iPad with the sidebar open.
    expect(grid!.className).not.toMatch(/(^|\s)(sm|md|lg|xl):grid-cols-2/);
    expect(grid!.className).toMatch(/@\[\d+px\]:grid-cols-2/);
    expect(grid!.closest('.\\@container')).toBeTruthy();
  });
});

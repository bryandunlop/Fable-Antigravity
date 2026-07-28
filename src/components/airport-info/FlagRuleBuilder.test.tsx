import { readFileSync } from 'node:fs';
import path from 'node:path';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CompanyAirportProvider, RULES_KEY } from './CompanyAirportContext';
import FlagRuleBuilder from './FlagRuleBuilder';

/**
 * The live match count is the reason this builder is safe to give people (D50).
 * Tested against the real 2,128-airport facts file, because a preview that is
 * right about fixtures and wrong about the fleet's actual airports is worthless.
 */

const factsPayload = JSON.parse(
  readFileSync(path.resolve(__dirname, '../../../public/airport-data/facts.json'), 'utf8'),
);

describe('FlagRuleBuilder', () => {
  beforeEach(() => {
    localStorage.removeItem(RULES_KEY);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => factsPayload }) as Response),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists the seeded rules with how many airports each flags', async () => {
    render(
      <CompanyAirportProvider>
        <FlagRuleBuilder />
      </CompanyAirportProvider>,
    );

    expect(screen.getByText('Short runway')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText(/flags [\d,]+ airports/).length).toBeGreaterThan(0));
  });

  it('shows a match count against the real set while a rule is being written', async () => {
    const user = userEvent.setup();
    render(
      <CompanyAirportProvider>
        <FlagRuleBuilder />
      </CompanyAirportProvider>,
    );

    await user.click(screen.getByRole('button', { name: /new flag/i }));

    await waitFor(() =>
      expect(screen.getByText(/flags [\d,]+ of [\d,]+ airports/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/of 2,128 airports/i)).toBeInTheDocument();
  });

  it('narrows the count as the threshold tightens', async () => {
    const user = userEvent.setup();
    render(
      <CompanyAirportProvider>
        <FlagRuleBuilder />
      </CompanyAirportProvider>,
    );
    await user.click(screen.getByRole('button', { name: /new flag/i }));
    await waitFor(() => expect(screen.getByText(/flags [\d,]+ of/i)).toBeInTheDocument());

    const readCount = () =>
      Number(
        screen
          .getByText(/flags [\d,]+ of/i)
          .textContent!.match(/Flags ([\d,]+) of/)![1]
          .replace(/,/g, ''),
      );

    const atDefault = readCount();
    const valueBox = screen.getByDisplayValue('6000');
    await user.clear(valueBox);
    await user.type(valueBox, '5200');

    await waitFor(() => expect(readCount()).toBeLessThan(atDefault));
  });

  it('warns when a rule matches nothing rather than letting it be saved silently', async () => {
    const user = userEvent.setup();
    render(
      <CompanyAirportProvider>
        <FlagRuleBuilder />
      </CompanyAirportProvider>,
    );
    await user.click(screen.getByRole('button', { name: /new flag/i }));
    await waitFor(() => expect(screen.getByText(/flags [\d,]+ of/i)).toBeInTheDocument());

    const valueBox = screen.getByDisplayValue('6000');
    await user.clear(valueBox);
    await user.type(valueBox, '100');

    await waitFor(() => expect(screen.getByText(/nothing matches/i)).toBeInTheDocument());
  });

  it('will not save a flag with no name', async () => {
    const user = userEvent.setup();
    render(
      <CompanyAirportProvider>
        <FlagRuleBuilder />
      </CompanyAirportProvider>,
    );
    await user.click(screen.getByRole('button', { name: /new flag/i }));

    expect(screen.getByRole('button', { name: /save flag/i })).toBeDisabled();
  });

  it('saves a new flag and lists it', async () => {
    const user = userEvent.setup();
    render(
      <CompanyAirportProvider>
        <FlagRuleBuilder />
      </CompanyAirportProvider>,
    );
    await user.click(screen.getByRole('button', { name: /new flag/i }));
    await user.type(screen.getByLabelText(/flag name/i), 'Narrow runway');
    await user.click(screen.getByRole('button', { name: /save flag/i }));

    expect(screen.getByText('Narrow runway')).toBeInTheDocument();
  });
});

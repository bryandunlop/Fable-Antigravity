import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PartsInventory from './PartsInventory';

// The fold (D76) hides everything that needs nothing. That is right by default and
// wrong the moment someone types a part number: a healthy part is the likeliest thing
// they are looking up, and answering a direct query with an empty list and a closed
// drawer is worse than the nine-column table this replaced.

const inStockPart = /G650-HYD-018/;

describe('PartsInventory — the fold must not eat a search result', () => {
  it('folds a part that is above its minimum by default', () => {
    render(<PartsInventory />);
    expect(screen.queryByText(inStockPart)).toBeNull();
    expect(screen.getByRole('button', { name: /in stock$/ })).toBeTruthy();
  });

  it('shows that same part directly once it is searched for', () => {
    render(<PartsInventory />);
    const search = screen.getByPlaceholderText(/Search by part number/);

    fireEvent.change(search, { target: { value: 'HYD' } });

    expect(screen.getByText(inStockPart)).toBeTruthy();
    // and no drawer left standing between the query and its answer
    expect(screen.queryByRole('button', { name: /in stock$/ })).toBeNull();
  });

  it('restores the fold when the search is cleared', () => {
    render(<PartsInventory />);
    const search = screen.getByPlaceholderText(/Search by part number/);

    fireEvent.change(search, { target: { value: 'HYD' } });
    fireEvent.change(search, { target: { value: '' } });

    expect(screen.queryByText(inStockPart)).toBeNull();
    expect(screen.getByRole('button', { name: /in stock$/ })).toBeTruthy();
  });

  it('says the search missed, rather than claiming every part is healthy', () => {
    render(<PartsInventory />);
    fireEvent.change(screen.getByPlaceholderText(/Search by part number/), {
      target: { value: 'NOTHINGMATCHESTHIS' },
    });

    expect(screen.getByText(/No part matches that search/)).toBeTruthy();
    expect(screen.queryByText(/Every part is above its minimum/)).toBeNull();
  });
});

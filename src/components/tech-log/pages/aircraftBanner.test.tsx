import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TechLogProvider } from '../TechLogContext';
import AircraftDetail from './AircraftDetail';

/**
 * D71 — the aircraft workspace states itself once.
 *
 * The failure this pins is duplication, not decoration: the page used to name the tail in the shell
 * header and answer "is it dispatchable, and why" in a card two nav rows below. The half that
 * matters was the half you had to scroll to, and a reader could take the top of the page as the
 * whole answer. So the assertions are (a) the governing sentence sits in the banner, and (b) there
 * is exactly ONE of it on the page — a re-added status card fails this file even though it would
 * look perfectly reasonable in a diff.
 */
function renderTail(tail: string, role: 'pilot' | 'maintenance' = 'maintenance') {
  return render(
    <MemoryRouter initialEntries={[`/tech-log/aircraft/${tail}`]}>
      <TechLogProvider userRole={role}>
        <Routes>
          <Route path="/tech-log/aircraft/:tail" element={<AircraftDetail />} />
        </Routes>
      </TechLogProvider>
    </MemoryRouter>,
  );
}

describe('aircraft workspace banner (D71)', () => {
  it('the tail is the page heading, not a line above the nav', () => {
    renderTail('N2PG');

    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('N2PG');
  });

  it('carries the serviceability state and the governing sentence in the banner', () => {
    renderTail('N2PG');

    /*
     * Scoped to the banner on purpose. The governing sentence names the governing ITEM, and that
     * item's text also appears on the blocker board below — an unscoped query would pass on the
     * board alone, i.e. it would pass in exactly the state this change exists to fix.
     */
    const banner = within(screen.getByTestId('aircraft-banner'));
    expect(banner.getByRole('heading', { level: 1 })).toHaveTextContent('N2PG');
    // The chip, whose whole text is the RAG label — anchored so the governing sentence's own
    // "grounded" cannot satisfy it.
    expect(banner.getByText(/^(Serviceable|MEL \/ restricted|Grounded)$/)).toBeInTheDocument();
    // The sentence itself, not just a status word: "<tail> is grounded because of ATA 79 — ...".
    expect(banner.getByText(/N2PG is (grounded|serviceable|dispatchable)/i)).toBeInTheDocument();
    // The vitals strip replaces the old subtitle string.
    expect(banner.getByText('Hours')).toBeInTheDocument();
    expect(banner.getByText('Cycles')).toBeInTheDocument();
    expect(banner.getByText('Blockers')).toBeInTheDocument();
  });

  it('states the aircraft status exactly once — no second status card', () => {
    renderTail('N2PG');

    // The "as of <time>" stamp belongs to the status statement. Two of them means two statements.
    expect(screen.queryAllByText(/as of /).length).toBe(1);
  });

  it('drops the constant eyebrow on this page — the tail is the headline', () => {
    renderTail('N2PG');

    expect(screen.queryByText('Global Flight Operations')).not.toBeInTheDocument();
  });

  /**
   * A provisional tail has no RAG state to show — showing one would imply a dispatch answer the
   * D195 MEL cannot yet give (its approval_state is PENDING_FSDO). It gets the Provisional badge
   * and a neutral rail instead.
   */
  it('a provisional tail shows Provisional rather than a RAG state', () => {
    renderTail('N3PG');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('N3PG');
    expect(screen.getAllByText('Provisional').length).toBeGreaterThan(0);
  });
});

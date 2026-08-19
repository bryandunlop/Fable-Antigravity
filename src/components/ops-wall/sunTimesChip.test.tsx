import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SunTimesChip from './SunTimesChip';

const AUG = new Date('2026-08-19T14:00:00Z');

describe('SunTimesChip (D88 polish)', () => {
  it('renders sunrise and sunset in the FIELD zone, labelled', () => {
    render(<SunTimesChip station="KLUK" now={AUG} />);
    // Cincinnati, 19 Aug 2026: ~06:53 / ~20:30 EDT.
    expect(screen.getByText(/^0[67]:\d\d$/)).toBeInTheDocument();
    expect(screen.getByText(/^20:\d\d$/)).toBeInTheDocument();
    expect(screen.getByText('EDT')).toBeInTheDocument();
  });

  it('uses the station own zone, not one operator reference zone', () => {
    // KLAX is Pacific — its sunset must NOT read as an Eastern clock time.
    const { container } = render(<SunTimesChip station="KLAX" now={AUG} />);
    expect(container.textContent).toContain('PDT');
  });

  it('renders nothing for a station with no coordinates or zone on file', () => {
    const { container } = render(<SunTimesChip station="ZZZZ" now={AUG} />);
    expect(container.firstChild).toBeNull();
  });
});

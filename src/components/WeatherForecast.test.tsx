import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WeatherForecast from './WeatherForecast';

// WeatherForecast calls fetchForecast() on mount, which reaches the NWS
// network service. Stub it so this test is deterministic and offline. periods
// is empty on purpose: the advisory label renders independent of forecast
// state, which is exactly the point below.
let mockPeriods: unknown[] = [];
vi.mock('../services/nwsForecastService', () => ({
  fetchForecast: vi.fn(async () => ({
    periods: mockPeriods,
    fetchedAt: '2026-07-24T00:00:00Z',
  })),
}));

function period(n: number) {
  return {
    number: n, name: `Day ${n}`, isDaytime: true, tempC: 20 + n, windKt: 8,
    precipProbability: 10, shortForecast: 'Sunny', detailedForecast: 'Sunny all day',
  };
}

describe('WeatherForecast — Q14 advisory label (TL-11)', () => {
  it('renders the "not for flight planning" mitigation label', async () => {
    render(<WeatherForecast icaoId="KPWK" />);

    // The label renders immediately, independent of the async forecast fetch —
    // asserting it here (before the await below) proves it is not gated on load
    // state. This label is the mitigation on file for Q14: a non-aviation 7-day
    // outlook rendered directly beneath official METAR/TAF. WeatherForecast.tsx
    // marks it "do not remove without a DOM ruling" — but until this test
    // existed, deleting it kept every test green (the whole point of TL-11).
    // This assertion is what makes that comment enforceable.
    expect(
      screen.getByText('Planning outlook — not for flight planning'),
    ).toBeInTheDocument();

    // WeatherForecast fires an async fetch in useEffect; wait for it to settle
    // so the post-resolve setState runs inside act() rather than after the test
    // returns. With the empty mock the loaded state shows the no-data message.
    // (This is the async pattern every future component test here should copy.)
    await screen.findByText(/No outlook available/i);
  });
});

describe('WeatherForecast — maxDays (D88)', () => {
  it('caps the rendered outlook at maxDays and labels accordingly', async () => {
    mockPeriods = [1, 2, 3, 4, 5, 6, 7].map(period);
    render(<WeatherForecast icaoId="KLUK" maxDays={5} />);

    expect(screen.getByText('5-DAY OUTLOOK')).toBeInTheDocument();
    await screen.findByText('Day 5');
    expect(screen.queryByText('Day 6')).not.toBeInTheDocument();
    // The Q14 mitigation label survives the cap.
    expect(screen.getByText('Planning outlook — not for flight planning')).toBeInTheDocument();
    mockPeriods = [];
  });
});

import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import type { RunwayRecord } from '../../airport/types';
import { RunwayDiagram } from './RunwayDiagram';

/**
 * The diagram's whole value is that it is TO SCALE. A bar that stops being
 * proportional is worse than no diagram, because it looks authoritative while
 * misrepresenting a distance a crew plans against.
 */

const KTEB_01_19: RunwayRecord = {
  runwayId: '01/19',
  lengthFt: 6997,
  widthFt: 150,
  surfaceTypeCode: 'ASPH',
  condition: 'GOOD',
  treatmentCode: 'GRVD',
  lightingCode: 'HIGH',
  pavement: { classification: null, alsoPublished: null, grossWeight: null },
  ends: [
    {
      endId: '01',
      trueAlignmentDeg: 3,
      elevationFt: 8.3,
      displacedThresholdFt: 770,
      gradientPct: null,
      approachLightingCode: null,
      ilsType: null,
      markingTypeCode: null,
      declaredDistances: { toraFt: 6997, todaFt: 6997, asdaFt: 6929, ldaFt: 6159 },
    },
    {
      endId: '19',
      trueAlignmentDeg: 183,
      elevationFt: 6.3,
      displacedThresholdFt: 767,
      gradientPct: null,
      approachLightingCode: null,
      ilsType: null,
      markingTypeCode: null,
      declaredDistances: { toraFt: 6997, todaFt: 6997, asdaFt: 6997, ldaFt: 6230 },
    },
  ],
};

function widths(container: HTMLElement, className: string): string[] {
  return [...container.querySelectorAll<HTMLElement>(`div[class*="${className}"]`)].map(
    (el) => el.style.width,
  );
}

describe('RunwayDiagram', () => {
  it('scales the runway against the airport’s longest', () => {
    const { container } = render(
      <RunwayDiagram
        runway={{ ...KTEB_01_19, runwayId: '06/24', lengthFt: 6014 }}
        scaleMax={6997}
      />,
    );

    const strip = container.querySelector<HTMLElement>('[role="img"]')!;
    // 6014 / 6997 = 85.95%
    expect(Number.parseFloat(strip.style.width)).toBeCloseTo(85.95, 1);
  });

  it('draws the shorter LDA visibly shorter than TORA', () => {
    const { container } = render(<RunwayDiagram runway={KTEB_01_19} scaleMax={6997} />);
    const bars = widths(container, 'bg-sky-500').map(Number.parseFloat);

    // End 01: TORA 6997, TODA 6997, ASDA 6929, LDA 6159 — the 838 ft the table
    // makes you subtract for yourself.
    expect(bars[0]).toBeCloseTo(100, 1);
    expect(bars[2]).toBeCloseTo(99.03, 1);
    expect(bars[3]).toBeCloseTo(88.02, 1);
  });

  it('shows the two ends asymmetrically when the FAA publishes them that way', () => {
    const { container } = render(<RunwayDiagram runway={KTEB_01_19} scaleMax={6997} />);
    const bars = widths(container, 'bg-sky-500').map(Number.parseFloat);

    // End 19's ASDA is the full 6997 where end 01's is 6929.
    expect(bars[6]).toBeCloseTo(100, 1);
    expect(bars[6]).toBeGreaterThan(bars[2]);
  });

  it('shades the displaced threshold at the end it belongs to, in proportion', () => {
    const { container } = render(<RunwayDiagram runway={KTEB_01_19} scaleMax={6997} />);
    const shading = [...container.querySelectorAll<HTMLElement>('div[class*="bg-amber-400"]')];

    expect(shading).toHaveLength(2);
    // 770 / 6997 = 11.00%, 767 / 6997 = 10.96%
    expect(Number.parseFloat(shading[0].style.width)).toBeCloseTo(11.0, 1);
    expect(shading[0].getAttribute('title')).toMatch(/770 ft displaced threshold on 01/);
    expect(shading[1].getAttribute('title')).toMatch(/767 ft displaced threshold on 19/);
  });

  it('says plainly when nothing is published rather than drawing bars from runway length', () => {
    const bare: RunwayRecord = {
      ...KTEB_01_19,
      ends: KTEB_01_19.ends.map((end) => ({ ...end, declaredDistances: null })),
    };
    const { container } = render(<RunwayDiagram runway={bare} scaleMax={6997} />);

    expect(screen.getByText(/publishes no declared distances for this runway/i)).toBeInTheDocument();
    expect(screen.getByText(/not a substitute for TORA/i)).toBeInTheDocument();
    expect(widths(container, 'bg-sky-500')).toEqual([]);
  });
});

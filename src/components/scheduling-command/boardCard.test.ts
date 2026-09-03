import { describe, expect, it } from 'vitest';
import { cardTone, cardProblemLine, fieldOf, renderedDays } from './boardCard';

describe('the card says its worst problem first', () => {
  it('a gate or a blocked task is red; owed work is amber; ready is blue; nothing left is grey', () => {
    expect(cardTone({ labels: ['✕ gate'], crewMissing: false, status: 'on-track', openTasks: 3 })).toBe('red');
    expect(cardTone({ labels: [], crewMissing: false, status: 'blocked', openTasks: 1 })).toBe('red');
    expect(cardTone({ labels: ['△ change'], crewMissing: false, status: 'on-track', openTasks: 0 })).toBe('amber');
    expect(cardTone({ labels: [], crewMissing: true, status: 'ready', openTasks: 0 })).toBe('amber');
    expect(cardTone({ labels: [], crewMissing: false, status: 'ready', openTasks: 0 })).toBe('blue');
    expect(cardTone({ labels: [], crewMissing: false, status: 'on-track', openTasks: 2 })).toBe('amber');
  });
  it('line 3 reads worst first, then what is left', () => {
    expect(cardProblemLine({ labels: ['✕ gate', '△ change'], crewMissing: true, status: 'on-track', openTasks: 3 })).toBe('✕ gate · △ change · 3 open');
    expect(cardProblemLine({ labels: [], crewMissing: false, status: 'ready', openTasks: 0 })).toBe('ready');
    expect(cardProblemLine({ labels: [], crewMissing: false, status: 'airborne', openTasks: 0 })).toBe('airborne');
  });
  it('line 1 names the first stop that is not home; a homeward one-way names where it came from', () => {
    expect(fieldOf('KLUK → KLGA → KBOS → KLUK', 'KLUK')).toBe('KLGA');
    expect(fieldOf('KBED → KLUK', 'KLUK')).toBe('KBED');
    expect(fieldOf('KLUK → KLUK', 'KLUK')).toBe('KLUK');
  });
  it('a card is as wide as its days or its label floor, so the lane packing uses what is drawn', () => {
    expect(renderedDays(1, 44, 150)).toBeCloseTo(3.41, 2);
    expect(renderedDays(5, 44, 150)).toBe(5);
    expect(renderedDays(1, 88, 150)).toBeCloseTo(1.70, 2);
  });
});

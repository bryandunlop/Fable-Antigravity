// The card's tint is its worst problem (Bryan, 2026-09-03: "I like B" — cards on days — "but I like
// the edge line with the status stripe from A"). Pure, so the eye's first landing is testable.

import type { TripDerivedStatus } from './tripStatus';

export type CardTone = 'red' | 'amber' | 'blue' | 'grey';

export interface CardFacts {
  /** Mark labels from the booking: '✕ gate', '△ change', … */
  labels: string[];
  crewMissing: boolean;
  status: TripDerivedStatus;
  openTasks: number;
}

/** Red for a gate, a waiver or a blocked task; amber for anything still owed; blue when ready or flying; grey when done. */
export function cardTone(f: CardFacts): CardTone {
  if (f.status === 'blocked' || f.labels.some(l => l.startsWith('✕'))) return 'red';
  if (f.crewMissing || f.labels.length > 0 || f.status === 'behind' || f.status === 'attention' || f.status === 'uninteracted' || f.openTasks > 0) return 'amber';
  if (f.status === 'ready' || f.status === 'airborne' || f.status === 'on-track') return 'blue';
  return 'grey';
}

/** Line 3 of the card: the worst thing first, then what is left. Line 2 already says "no crew", so this line does not repeat it. */
export function cardProblemLine(f: CardFacts): string {
  const parts: string[] = [];
  if (f.status === 'blocked') parts.push('blocked');
  parts.push(...f.labels);
  if (parts.length === 0) return f.openTasks > 0 ? `${f.openTasks} open` : f.status === 'airborne' ? 'airborne' : 'ready';
  return parts.join(' · ') + (f.openTasks > 0 ? ` · ${f.openTasks} open` : '');
}

export const CARD_TONE_CLASS: Record<CardTone, string> = {
  red: 'bg-[var(--gfo-error,#EF3340)]/10 text-[var(--gfo-error-ink,#C81E2B)]',
  amber: 'bg-[var(--gfo-warning,#F1B434)]/15 text-[var(--gfo-warning-ink,#8A6200)]',
  blue: 'bg-[var(--gfo-daylight,#0096FC)]/10 text-[var(--gfo-midnight,#142D7E)] dark:text-[var(--gfo-daylight-light,#7FCCFE)]',
  grey: 'bg-muted text-muted-foreground',
};

/**
 * Where the trip goes, for line 1: the first stop that is not home. 'KBED → KLUK' is KBED, not
 * home; 'KLUK → KLGA → KBOS → KLUK' is KLGA (fresh review, 2026-09-03). Falls back to the last stop.
 */
export function fieldOf(route: string, home: string | undefined): string {
  const stops = route.split(' → ').map(s => s.trim()).filter(Boolean);
  if (stops.length === 0) return route;
  return stops.find(s => s !== home) ?? stops[stops.length - 1];
}

/** How many days a card really occupies on screen: its time span, or the label floor, whichever is wider. */
export function renderedDays(durationDays: number, colWidthPx: number, floorPx: number): number {
  return Math.max(durationDays, floorPx / colWidthPx);
}

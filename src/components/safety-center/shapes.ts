// Which SHAPE a verb's surface renders in, and how a viewer's override survives
// (D85 · C4). Each verb declares the shape its job deserves — triage is spatial,
// so a board; a decision is one thing at a time, so a queue — and the toggle is
// an override, not the primary control.
//
// The resolution is a pure function of (verb, overrides) so it can be tested
// without a DOM; only `loadOverrides` / `saveOverride` touch storage.

import { verbDef, type Shape, type VerbId } from './verbs';

export const SHAPE_STORAGE_KEY = 'mygfo.safety.shapes';

export type ShapeOverrides = Partial<Record<VerbId, Shape>>;

/** The shape to render. An override only wins if the verb actually offers that
 *  shape — a stale entry from an earlier build must not blank the console. */
export function resolveShape(verb: VerbId, overrides: ShapeOverrides): Shape {
  const def = verbDef(verb);
  const override = overrides[verb];
  return override && def.shapes.includes(override) ? override : def.defaultShape;
}

/** True when the verb has something to toggle between. A single-shape verb
 *  shows no toggle rather than a control that does nothing. */
export function canToggle(verb: VerbId): boolean {
  return verbDef(verb).shapes.length > 1;
}

/** The other shape, for a two-shape toggle. Returns the current shape unchanged
 *  where there is nothing to switch to. */
export function nextShape(verb: VerbId, current: Shape): Shape {
  const shapes = verbDef(verb).shapes;
  if (shapes.length < 2) return current;
  const i = shapes.indexOf(current);
  return shapes[(i + 1) % shapes.length];
}

/** Setting one verb's shape must not disturb another's — the override is
 *  per-verb by design, so Triage staying a board while Mitigate becomes one is
 *  the expected outcome, not a bug. */
export function withOverride(overrides: ShapeOverrides, verb: VerbId, shape: Shape): ShapeOverrides {
  return { ...overrides, [verb]: shape };
}

// ── storage ────────────────────────────────────────────────────────────────
// Preferences only. A corrupt or absent value reads as "no overrides" rather
// than throwing on a console the user is trying to open.

export function parseOverrides(raw: string | null): ShapeOverrides {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as ShapeOverrides;
  } catch {
    return {};
  }
}

export function loadOverrides(): ShapeOverrides {
  try {
    return parseOverrides(localStorage.getItem(SHAPE_STORAGE_KEY));
  } catch {
    return {};
  }
}

export function saveOverrides(overrides: ShapeOverrides): void {
  try {
    localStorage.setItem(SHAPE_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    /* storage full or blocked — the console still works, the choice just
       does not survive a reload. */
  }
}

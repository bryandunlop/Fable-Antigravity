import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  LIST_EXPANDED_MIN_WIDTH,
  initialListExpanded,
  readPersistedListState,
  writePersistedListState,
} from './listColumn';

/**
 * D84 slice 1 — the flight list is a permanent column, so its collapsed/expanded state is a
 * real piece of UI state with the same shape as the global nav rail's (navigation/sidebarDefault).
 * Deliberately the same contract: an explicit choice always wins over the width default, and a
 * hostile or absent localStorage must never throw into the render path.
 */
describe('flight list column default (D84)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('starts expanded on iPad landscape and wider', () => {
    expect(initialListExpanded(1194, null)).toBe(true);
    expect(initialListExpanded(1440, null)).toBe(true);
    expect(initialListExpanded(LIST_EXPANDED_MIN_WIDTH, null)).toBe(true);
  });

  it('starts collapsed below the threshold, where 320pt of list would crowd the detail pane', () => {
    // iPad portrait: 834 - 64 rail - 320 list leaves 450 for the work itself.
    expect(initialListExpanded(834, null)).toBe(false);
    expect(initialListExpanded(LIST_EXPANDED_MIN_WIDTH - 1, null)).toBe(false);
  });

  it("an explicit choice wins over the width default, in both directions", () => {
    expect(initialListExpanded(834, 'true')).toBe(true);
    expect(initialListExpanded(1440, 'false')).toBe(false);
  });

  it('treats an unknown or corrupted persisted value as absent', () => {
    expect(initialListExpanded(1440, 'yes')).toBe(true);
    expect(initialListExpanded(834, '')).toBe(false);
  });

  it('never throws when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem() { throw new Error('private mode'); },
      setItem() { throw new Error('quota'); },
    });
    expect(readPersistedListState()).toBeNull();
    expect(() => writePersistedListState(true)).not.toThrow();
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installMemoryStorage } from '../test/memoryStorage';
import {
  initialSidebarOpen,
  readPersistedSidebarState,
  writePersistedSidebarState,
  RAIL_EXPANDED_MIN_WIDTH,
  SIDEBAR_STATE_KEY,
} from './sidebarDefault';

describe('initialSidebarOpen — width defaults (D80)', () => {
  it('starts expanded on desktop and iPad landscape', () => {
    expect(initialSidebarOpen(1440, null)).toBe(true);
    expect(initialSidebarOpen(1194, null)).toBe(false);
    expect(initialSidebarOpen(RAIL_EXPANDED_MIN_WIDTH, null)).toBe(true);
  });

  // The whole reason D80 exists: 834 used to render the full desktop rail,
  // ~55% of the pilot's screen (LG-198 / UI/UX review R4).
  it('starts collapsed at iPad portrait, the width the decision exists to fix', () => {
    expect(initialSidebarOpen(834, null)).toBe(false);
  });

  it('treats 1279 as the last collapsed width and 1280 as the first expanded one', () => {
    expect(initialSidebarOpen(1279, null)).toBe(false);
    expect(initialSidebarOpen(1280, null)).toBe(true);
  });
});

describe('initialSidebarOpen — an explicit choice beats the width default', () => {
  it('honours an expanded choice on a width that would default to collapsed', () => {
    expect(initialSidebarOpen(834, 'true')).toBe(true);
  });

  it('honours a collapsed choice on a width that would default to expanded', () => {
    expect(initialSidebarOpen(1440, 'false')).toBe(false);
  });

  it('falls back to the width default for any unrecognised stored value', () => {
    for (const junk of ['', 'TRUE', '1', 'yes', 'null', '{}']) {
      expect(initialSidebarOpen(834, junk)).toBe(false);
      expect(initialSidebarOpen(1440, junk)).toBe(true);
    }
  });
});

describe('persistence', () => {
  // This is a node-environment test file (*.test.ts), so there is no real
  // localStorage — see src/test/memoryStorage.ts for why a shared installer
  // exists instead of a per-file stub.
  let restoreStorage: () => void;

  beforeEach(() => {
    restoreStorage = installMemoryStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    restoreStorage();
  });

  it('round-trips a choice through localStorage', () => {
    writePersistedSidebarState(false);
    expect(readPersistedSidebarState()).toBe('false');
    writePersistedSidebarState(true);
    expect(readPersistedSidebarState()).toBe('true');
    expect(localStorage.getItem(SIDEBAR_STATE_KEY)).toBe('true');
  });

  it('returns null when nothing has been chosen yet', () => {
    expect(readPersistedSidebarState()).toBeNull();
  });

  // Private mode and quota-exceeded both throw on access. A nav that crashes
  // because it could not remember a preference is worse than one that forgets.
  it('survives a storage that throws on read and on write', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });

    expect(readPersistedSidebarState()).toBeNull();
    expect(() => writePersistedSidebarState(true)).not.toThrow();
  });
});

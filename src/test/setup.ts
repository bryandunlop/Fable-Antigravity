// Global test setup — runs before every test file, in whatever environment
// that file resolves to (node for *.test.ts, jsdom for *.test.tsx; see
// vitest.config.ts). Lives under src/ (not the repo root) so its jest-dom
// module augmentation below is part of the typed program — that is what makes
// `expect(...).toBeInTheDocument()` type-check in *.test.tsx files.
//
// Importing jest-dom's matchers only extends Vitest's `expect`; it needs no
// DOM, so it is harmless for the ~1500 node logic tests.
import { afterEach, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { installMemoryStorage } from './memoryStorage';

// Give DOM-environment tests a working `localStorage`. They do not get one by
// default: Node >= 24 defines a global `localStorage` of its own, and because
// Vitest's jsdom environment skips any window key the global already has,
// jsdom's real Storage is never copied over. What tests see instead is Node's
// bare placeholder object, so `localStorage.clear()` throws "not a function".
// Installing our own Storage makes the behaviour identical on every Node
// version. See src/test/memoryStorage.ts for the full explanation.
if (typeof document !== 'undefined') {
  installMemoryStorage();

  // Fresh storage per test case, so persistence tests in the same file cannot
  // see each other's keys.
  beforeEach(() => {
    localStorage.clear();
  });
}

// Unmount any React tree rendered by @testing-library/react after each test so
// state does not leak between cases. Guarded to a DOM environment and
// dynamically imported, so node-environment tests never load React Testing
// Library at all.
afterEach(async () => {
  if (typeof document !== 'undefined') {
    const { cleanup } = await import('@testing-library/react');
    cleanup();
  }
});

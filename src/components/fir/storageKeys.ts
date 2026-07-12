// Storage keys for the FIR store, kept in a React-free module so the read-only
// dashboard selector (engine/select.ts) can mirror the loader without importing
// FirContext (and React) — same split the notifications contributors use.
export const STORAGE_KEY = 'fir-state';
export const VERSION_KEY = 'fir-data-version';
export const DATA_VERSION = '2026-07-11-v4';

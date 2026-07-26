// Demo-data persistence policy — D37 Wave-1 Q3 (Bryan, 2026-07-24).
//
// Policy, stated once so the whole app follows one rule:
//   1. Everything a user enters in the demo persists in the browser's
//      localStorage, so the demo survives a reload.
//   2. There is exactly ONE way to wipe it back to the shipped seed —
//      resetAllDemoData() — surfaced as the single global "Reset demo data"
//      control in the top bar. Do not hand-roll a second reset path.
//
// Each store already reseeds from its own defaults when its key is absent (e.g.
// loadOrgLinks() falls back to DEFAULT_ORG_LINKS), so a full clear + reload needs
// no per-store teardown and automatically covers every current and future store.
//
// Note: this is a factory reset — it also clears incidental UI preferences kept in
// localStorage (theme, sidebar layout). That is intentional: "back to how it ships".
// Access keys are the one exception (see PRESERVED_KEYS).

// Keys that survive a reset because they gate access, not demo data. Wiping the
// demo-password unlock would bounce a presenter back to the password screen
// mid-demo — a reset should return to a clean seed, still past the gate.
const PRESERVED_KEYS = ['mygfo_demo_unlocked'];

/**
 * Clear all persisted demo data, keeping only the access keys in PRESERVED_KEYS.
 * `store` is passed explicitly (not defaulted) so the reset stays testable under
 * vitest's node environment, and the `clear` function check keeps it a safe no-op
 * when storage is absent or a partial stub.
 */
export function clearDemoData(store: Storage | undefined): void {
  if (typeof store?.clear !== 'function') return;
  const preserved = PRESERVED_KEYS
    .map((k) => [k, store.getItem(k)] as const)
    .filter((entry): entry is [string, string] => entry[1] !== null);
  store.clear();
  for (const [k, v] of preserved) store.setItem(k, v);
}

/** Wipe all demo data, then reload so every store reseeds from its defaults. */
export function resetAllDemoData(): void {
  clearDemoData(globalStorage());
  if (typeof window !== 'undefined') window.location.reload();
}

function globalStorage(): Storage | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage;
}

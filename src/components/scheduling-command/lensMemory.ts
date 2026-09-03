// The last lens a scheduler used, remembered per person (D110 slice 3, Bryan: "different for
// different people" → remember, no setting). Storage is injected so this stays pure and testable.

export type HomeLens = 'board' | 'horizon' | 'queue';
export const HOME_LENSES: HomeLens[] = ['board', 'horizon', 'queue'];
export const DEFAULT_LENS: HomeLens = 'board';

const key = (person: string) => `scheduling:lens:${person}`;

export function recallLens(person: string, storage: Pick<Storage, 'getItem'> | null): HomeLens {
  try {
    const v = storage?.getItem(key(person));
    return HOME_LENSES.includes(v as HomeLens) ? (v as HomeLens) : DEFAULT_LENS;
  } catch {
    return DEFAULT_LENS;
  }
}

export function rememberLens(person: string, lens: HomeLens, storage: Pick<Storage, 'setItem'> | null): void {
  try { storage?.setItem(key(person), lens); } catch { /* a private window forgets; that is fine */ }
}

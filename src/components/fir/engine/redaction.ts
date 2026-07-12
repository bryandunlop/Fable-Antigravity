// Name → role de-identification helper for the publish curation pass (§7).
// Detection is roster-first (known personnel names, reliable) plus a capitalized-
// name heuristic (catches hand-typed names / vendor contacts, may false-positive —
// the owner dismisses those, and the four-eyes reviewer is the backstop).
import type { Personnel } from '../../tech-log/types';

export interface NameMatch {
  text: string; // the exact matched span
  oid?: string; // set when it resolves to a roster person
  role?: string; // role snapshot when known (from the roster)
  suggestion: string; // role phrase to substitute in ("the PIC")
  source: 'ROSTER' | 'HEURISTIC';
}

/** Role → published phrase. Falls back to a lower-cased role label. */
const ROLE_PHRASE: Record<string, string> = {
  PILOT: 'the PIC',
  CAPTAIN: 'the PIC',
  FO: 'the SIC',
  MAINTENANCE: 'the assigned technician',
  'CHIEF-INSPECTOR': 'the inspector',
  INFLIGHT: 'the flight attendant',
  DOM: 'the DOM',
  'CHIEF-PILOT': 'the chief pilot',
  SCHEDULING: 'the scheduler',
};

export function rolePhraseFor(role?: string): string {
  if (!role) return 'the individual';
  const key = role.toUpperCase();
  return ROLE_PHRASE[key] ?? `the ${role.toLowerCase()}`;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A hand-typed full name: two+ capitalized tokens. Excludes ALL-CAPS runs (tail
// numbers like N1PG, acronyms like AOG, TEB) by requiring a lowercase tail.
const HEURISTIC_RE = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;

/** Names present in the text — roster matches first, then heuristic full-names not
 * already covered by a roster hit. Returned in order of first appearance. */
export function detectNames(text: string, personnel: Personnel[]): NameMatch[] {
  if (!text) return [];
  const found: (NameMatch & { at: number })[] = [];
  const covered: Array<[number, number]> = [];
  const overlaps = (s: number, e: number) => covered.some(([cs, ce]) => s < ce && e > cs);

  // Roster: match each active person's display name (longest first, so "Capt. John
  // Smith" wins over "John Smith" if both were in the roster).
  const roster = [...personnel]
    .filter(p => p.displayName)
    .sort((a, b) => b.displayName.length - a.displayName.length);
  for (const p of roster) {
    const re = new RegExp(escapeRe(p.displayName), 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const s = m.index;
      const e = s + m[0].length;
      if (overlaps(s, e)) continue;
      covered.push([s, e]);
      found.push({ text: m[0], oid: p.oid, role: p.role, suggestion: rolePhraseFor(p.role), source: 'ROSTER', at: s });
    }
  }

  // Heuristic: capitalized full-names not already covered by a roster hit.
  let hm: RegExpExecArray | null;
  while ((hm = HEURISTIC_RE.exec(text))) {
    const s = hm.index;
    const e = s + hm[0].length;
    if (overlaps(s, e)) continue;
    covered.push([s, e]);
    found.push({ text: hm[0], suggestion: 'the individual', source: 'HEURISTIC', at: s });
  }

  return found.sort((a, b) => a.at - b.at).map(({ at: _at, ...m }) => m);
}

/** True if any known roster name still appears — the submit-gate signal. Heuristic-
 * only hits warn but never block (they are frequently false positives). */
export function hasUnredactedRosterNames(text: string, personnel: Personnel[]): boolean {
  return detectNames(text, personnel).some(m => m.source === 'ROSTER');
}

/** Replace every occurrence of a matched name with its role phrase. */
export function applyRedaction(text: string, name: string, phrase: string): string {
  if (!name) return text;
  return text.replace(new RegExp(escapeRe(name), 'g'), phrase);
}

// The aviation vocabulary a search engine has to be taught.
//
// No search library ships one. Lunr, FlexSearch, MiniSearch, SQLite FTS5, Azure
// AI Search — every one expects the operator to supply their own synonym map, and
// the cost of search in this domain is this file, not the indexing.
//
// The failure it prevents is specific: a pilot types "pax", the manual says
// "passengers", and search reports nothing. The reader concludes the document
// centre does not have it and goes back to asking someone.

/**
 * Groups of terms that mean the same thing here.
 *
 * Each group expands in every direction — matching any member matches them all —
 * so order within a group carries no meaning. Deliberately curated rather than
 * inferred: "CAT" means an aerodrome category, clear-air turbulence, and a repair
 * interval depending on the sentence, and a guessed expansion is worse than none.
 */
export const TERM_GROUPS: readonly (readonly string[])[] = [
  ['pax', 'passenger', 'passengers'],
  ['mel', 'minimum equipment list'],
  ['cdl', 'configuration deviation list'],
  ['nef', 'nonessential equipment and furnishings', 'non-essential equipment and furnishings'],
  ['aog', 'aircraft on ground'],
  ['crs', 'certificate of release to service', 'return to service', 'rts'],
  ['afm', 'aircraft flight manual', 'airplane flight manual'],
  ['amm', 'aircraft maintenance manual'],
  ['ipc', 'illustrated parts catalogue', 'illustrated parts catalog'],
  ['sb', 'service bulletin'],
  ['ad', 'airworthiness directive'],
  ['gom', 'general operations manual'],
  ['sop', 'standard operating procedure', 'standard operating procedures'],
  ['erp', 'emergency response plan'],
  ['sms', 'safety management system'],
  ['frat', 'flight risk assessment tool', 'risk assessment'],
  ['pic', 'pilot in command'],
  ['sic', 'second in command'],
  ['fa', 'flight attendant', 'cabin crew'],
  ['dom', 'director of maintenance'],
  ['rvsm', 'reduced vertical separation minimum'],
  ['efvs', 'enhanced flight vision system'],
  ['efb', 'electronic flight bag'],
  ['oca', 'oceanic control area'],
  ['fbo', 'fixed base operator'],
  ['etops', 'extended operations'],
  ['oooi', 'out off on in'],
  ['cas', 'crew alerting system'],
  ['cmc', 'central maintenance computer'],
  ['rii', 'required inspection item'],
  ['loa', 'letter of authorization', 'letter of authorisation'],
  ['fsdo', 'flight standards district office'],
  ['deice', 'de-ice', 'de-icing', 'deicing', 'anti-ice', 'anti-icing'],
  ['fuelling', 'fueling', 'refuel', 'refuelling', 'refueling'],
  ['wx', 'weather'],
  ['tow', 'towing', 'pushback'],
];

/** term → every term it should also match (including itself). */
const EXPANSIONS: Map<string, string[]> = (() => {
  const m = new Map<string, string[]>();
  for (const group of TERM_GROUPS) {
    for (const term of group) {
      const key = term.toLowerCase();
      m.set(key, [...new Set([...(m.get(key) ?? []), ...group.map((t) => t.toLowerCase())])]);
    }
  }
  return m;
})();

/** Lower-case, strip punctuation, split. Keeps digits — "91.213" matters here. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9.\-\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^[.\-]+|[.\-]+$/g, ''))
    .filter(Boolean);
}

/**
 * Expand a query into the terms that should match it.
 *
 * Multi-word entries ("minimum equipment list") are matched as phrases by the
 * caller, so they come back whole rather than tokenized — splitting them would
 * make a search for "MEL" match any document containing the word "equipment".
 */
export function expandQuery(query: string): { terms: string[]; expandedFrom: Map<string, string[]> } {
  const tokens = tokenize(query);
  const terms = new Set<string>(tokens);
  const expandedFrom = new Map<string, string[]>();

  for (const token of tokens) {
    const also = EXPANSIONS.get(token);
    if (!also) continue;
    const added = also.filter((t) => t !== token);
    if (added.length === 0) continue;
    expandedFrom.set(token, added);
    for (const t of added) terms.add(t);
  }

  // A multi-word query may itself be a known phrase ("minimum equipment list" →
  // "mel"), which single-token expansion above cannot see.
  const whole = query.trim().toLowerCase();
  const wholeAlso = EXPANSIONS.get(whole);
  if (wholeAlso) {
    const added = wholeAlso.filter((t) => t !== whole);
    if (added.length) {
      expandedFrom.set(whole, added);
      for (const t of added) terms.add(t);
    }
  }

  return { terms: [...terms], expandedFrom };
}

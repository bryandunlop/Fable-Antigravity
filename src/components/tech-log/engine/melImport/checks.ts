/**
 * The machine half of a MEL import (D95).
 *
 * The human attests the *document* — "this is D195 G650ER Rev 1, 04-27-26, under LOA
 * ⟨ref⟩". Nobody attests that the parser read it correctly, and no realistic human review
 * of 700 rows would catch a repair category misread as a different letter. So parse
 * fidelity is established here, by machine, before anyone is asked to sign anything.
 *
 * Two severities, and the difference is honest about what is actually known:
 *  - BLOCK    — something is provably wrong, or provably unread. No import.
 *  - CONFIRM  — something looks unusual but a real MEL revision could legitimately do it.
 *               The approver clears it explicitly; it is never cleared silently.
 *
 * D95 called for reconciling parsed totals against "the document's own counts". Neither
 * approved MEL states a count, and neither carries a list of effective pages — so that
 * check does not exist to be written. What the documents DO state, on every page, is the
 * aircraft and the page number, so completeness is established from those instead. This
 * is strictly stronger than a total: a count says something is missing, a page run says
 * which page.
 */
import type { AircraftType, MelItem, MelSection } from '../../types';
import type { ParseResult } from './parse';

export type CheckSeverity = 'BLOCK' | 'CONFIRM';

export interface ImportCheck {
  id: string;
  severity: CheckSeverity;
  title: string;
  detail: string;
}

export interface CatalogChange {
  before: MelItem;
  after: MelItem;
  fields: string[];
}

export interface CatalogDiff {
  added: MelItem[];
  changed: CatalogChange[];
  removed: MelItem[];
  unchanged: number;
}

/** Every page footer names the aircraft: "Aircraft: G-500" / "Aircraft: G650ER". */
const FOOTER_AIRCRAFT = /Aircraft:\s*(G[-\s]?\w+)/g;
const FOOTER_PAGE = /Page\s+([A-Za-z0-9]+)-(\d+)\s*$/gm;

/**
 * The G500 MEL hyphenates its own type where the G650ER does not, so the footer token is
 * normalised rather than compared literally. An unrecognised token is left unmapped on
 * purpose — there is no G800 MEL yet to learn its spelling from, and inventing one would
 * turn an unverifiable upload into a confidently wrong one.
 */
function aircraftFromToken(token: string): AircraftType | null {
  const t = token.toUpperCase().replace(/[-\s]/g, '');
  if (t === 'G500') return 'G500';
  if (t === 'G650ER') return 'G650ER';
  if (t === 'G800') return 'G800';
  return null;
}

/**
 * Fields a signature or a dispatch decision can turn on. Deliberately excludes:
 *  - `mmelRevision` / `effectiveDate`, which a new revision restamps on every row — if
 *    those counted, the diff would read "495 changed" at every revision and stop being a
 *    check on anything;
 *  - `approvalState`, which the parser is not permitted to set (D95);
 *  - `id`, which is derived from the item number already compared.
 */
const CONTENT_FIELDS = [
  'itemNumber', 'subItemNumber', 'title', 'category', 'provisos', 'oProcedure', 'mProcedure',
  'casMessage', 'casColor', 'casLevel', 'nefArea', 'placardText', 'placardLocation',
  'ataReference', 'numberInstalled', 'numberRequired', 'flightCrewDeferral',
  'crewActionRequired', 'repairIntervalUnit', 'repairIntervalValue', 'melSection',
] as const satisfies readonly (keyof MelItem)[];

function changedFields(before: MelItem, after: MelItem): string[] {
  return CONTENT_FIELDS.filter(f => JSON.stringify(before[f] ?? null) !== JSON.stringify(after[f] ?? null));
}

function section(item: MelItem): MelSection {
  return item.melSection ?? 'ONE';
}

/**
 * Compare a parsed document against the catalog already loaded.
 *
 * Scoped to the sections the document actually yielded. A Section Two / NEF MEL says
 * nothing whatsoever about Section One, and diffing against the whole catalog would
 * report all 984 Section One items as removed — which is not a wrong answer so much as a
 * question the document was never asked.
 */
export function diffCatalog(
  parsed: MelItem[],
  currentCatalog: MelItem[],
  aircraftType: AircraftType,
): CatalogDiff {
  const sections = new Set(parsed.map(section));
  const current = currentCatalog.filter(
    m => m.aircraftType === aircraftType && sections.has(section(m)),
  );

  const byNumber = new Map(current.map(m => [m.subItemNumber, m]));
  const added: MelItem[] = [];
  const changed: CatalogChange[] = [];
  let unchanged = 0;

  for (const item of parsed) {
    const before = byNumber.get(item.subItemNumber);
    if (!before) {
      added.push(item);
      continue;
    }
    byNumber.delete(item.subItemNumber);
    const fields = changedFields(before, item);
    if (fields.length) changed.push({ before, after: item, fields });
    else unchanged += 1;
  }

  return { added, changed, removed: [...byNumber.values()], unchanged };
}

function pageGaps(lines: string[]): string[] {
  const runs = new Map<string, Set<number>>();
  for (const m of lines.join('\n').matchAll(FOOTER_PAGE)) {
    const set = runs.get(m[1]) ?? new Set<number>();
    set.add(Number(m[2]));
    runs.set(m[1], set);
  }
  const missing: string[] = [];
  for (const [prefix, set] of runs) {
    const ns = [...set].sort((a, b) => a - b);
    for (let n = ns[0]; n < ns[ns.length - 1]; n += 1) {
      if (!set.has(n)) missing.push(`${prefix}-${n}`);
    }
  }
  return missing;
}

/**
 * Gaps in the item numbering within a group — 'N100-1, N100-3' with no N100-2.
 *
 * **NEF items only.** Both approved MELs number every NEF area contiguously from 1, so a
 * gap there means a row was dropped. Section Two numbering is sparse in the documents
 * themselves — the G650ER jumps 2-14 to 2-31 — because most of its CAS messages moved
 * under their Section One item (ref-d195-mel-structure). Applied to Section Two this
 * check fires on every clean import of both real MELs, which is how the scoping was
 * found.
 *
 * Even for NEF this is an observation of two documents, not a rule either document
 * states: a revision that withdraws an item could legitimately leave a hole. Hence
 * CONFIRM rather than BLOCK — the approver is shown it and clears it.
 */
function itemGaps(items: MelItem[]): string[] {
  const groups = new Map<string, Set<number>>();
  for (const it of items.filter(i => i.melSection === 'NEF')) {
    const m = it.subItemNumber.match(/^(.*?)-(\d+)[A-Z]?$/);
    if (!m) continue;
    const set = groups.get(m[1]) ?? new Set<number>();
    set.add(Number(m[2]));
    groups.set(m[1], set);
  }
  const missing: string[] = [];
  for (const [prefix, set] of groups) {
    const ns = [...set].sort((a, b) => a - b);
    for (let n = ns[0]; n < ns[ns.length - 1]; n += 1) {
      if (!set.has(n)) missing.push(`${prefix}-${n}`);
    }
  }
  return missing;
}

export interface CheckImportInput {
  lines: string[];
  parsed: ParseResult;
  selectedType: AircraftType;
  currentCatalog: MelItem[];
}

export interface CheckImportResult {
  checks: ImportCheck[];
  diff: CatalogDiff;
  /** True if any BLOCK check fired. The import cannot proceed. */
  blocked: boolean;
}

export function checkImport({
  lines,
  parsed,
  selectedType,
  currentCatalog,
}: CheckImportInput): CheckImportResult {
  const checks: ImportCheck[] = [];

  if (parsed.warnings.length) {
    checks.push({
      id: 'parse-warnings',
      severity: 'BLOCK',
      title: `The parser could not read ${parsed.warnings.length} part(s) of this document`,
      detail: parsed.warnings.join('\n'),
    });
  }

  if (parsed.items.length === 0) {
    checks.push({
      id: 'no-items',
      severity: 'BLOCK',
      title: 'No MEL items were found in this document',
      detail: 'Nothing was parsed. This is not the right file, or its layout is not readable.',
    });
  }

  if (!parsed.revision || !parsed.effectiveDate) {
    checks.push({
      id: 'no-revision',
      severity: 'BLOCK',
      title: 'No revision identity could be read from the document',
      detail:
        'The revision and its date are read from the page footers, never from the filename. ' +
        'Without them a deferral cannot record which revision governed it.',
    });
  }

  const tokens = [...lines.join('\n').matchAll(FOOTER_AIRCRAFT)].map(m => m[1]);
  const found = new Set(tokens.map(aircraftFromToken).filter(Boolean) as AircraftType[]);
  if (found.size === 0) {
    checks.push({
      id: 'aircraft-unverified',
      severity: 'CONFIRM',
      title: 'This document does not name an aircraft type myGFO recognises',
      detail: tokens.length
        ? `Its pages read "${tokens[0]}". Confirm this is the ${selectedType} MEL.`
        : `No "Aircraft:" footer was found. Confirm this is the ${selectedType} MEL.`,
    });
  } else if (!found.has(selectedType)) {
    checks.push({
      id: 'aircraft-mismatch',
      severity: 'BLOCK',
      title: `This is the ${[...found].join(' / ')} MEL, not the ${selectedType} MEL`,
      detail:
        `Every page of this document states its aircraft, and it reads ` +
        `${[...found].join(' / ')}. Loading it against ${selectedType} would put one ` +
        `fleet's relief on another fleet's aircraft.`,
    });
  }

  const gaps = pageGaps(lines);
  if (gaps.length) {
    checks.push({
      id: 'page-gap',
      severity: 'BLOCK',
      title: `${gaps.length} page(s) are missing from this document`,
      detail: `The page numbering skips ${gaps.join(', ')}. Whatever those pages held was not read.`,
    });
  }

  const missingItems = itemGaps(parsed.items);
  if (missingItems.length) {
    checks.push({
      id: 'item-gap',
      severity: 'CONFIRM',
      title: `${missingItems.length} item number(s) are absent from an otherwise unbroken run`,
      detail:
        `Nothing was read for ${missingItems.join(', ')}. A revision may have withdrawn them ` +
        `— or the rows were dropped. Confirm against the document.`,
    });
  }

  const diff = diffCatalog(parsed.items, currentCatalog, selectedType);

  return { checks, diff, blocked: checks.some(c => c.severity === 'BLOCK') };
}

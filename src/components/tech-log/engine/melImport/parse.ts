/**
 * Parse an approved P&G D195 MEL into `MelItem` rows — Section Two (CAS Message Relief)
 * and the NEF Deferral List.
 *
 * A port of `scripts/extract_mel_sections.py` (the offline extractor that produced the
 * seed catalog with D70) to run in the browser, per D95. Input is layout-preserved text
 * lines — `layout.ts` in this folder, or `pdftotext -layout`.
 *
 * Nothing here infers content. Every field is a verbatim slice of the document, with the
 * two exceptions marked DERIVED below.
 *
 * One deliberate divergence from the Python: items come out `DRAFT`, never `APPROVED`.
 * The offline script wrote `APPROVED` because a human had already vouched for the file it
 * was handed. In the product the attestation is the whole point — a parser must not be
 * able to approve a MEL item (`CLAUDE.md`; D95). The import commit sets the state once a
 * separate approver has attested the document.
 */
import type { AircraftType, CasColor, CasLevel, MelCategory, MelItem } from '../../types';

export interface ParseResult {
  items: MelItem[];
  /** Any entry here blocks the import (D95). Never advisory. */
  warnings: string[];
  /** Revision identity read from the document body — never from the filename (D95). */
  revision: string | null;
  effectiveDate: string | null;
}

// The G650ER footer reads "Aircraft: G650ER"; the G500's reads "Aircraft: G-500".
// Missing the hyphen lets the whole footer leak into the table columns.
const FOOTER = /^\s*Aircraft:\s*G[-\s]?\d/;
const REV = /Revision No:\s*(\S+)\s+Date:\s*(\d{2})-(\d{2})-(\d{2})/;
// Running heads and the one sub-area heading ("Lavatories", which subdivides area 400).
// These sit inside the procedure column and would otherwise be read as procedure text.
const CENTERED_NOISE =
  /^\s*(CAS Message|Minimum Equipment List|NEF Program|NEF|Intentionally Left Blank|Lavatories)\s*$/;
// "(Amber – Caution)" / "(Cyan- Advisory)" — the en-dash and the spacing both vary, and on
// narrower pages the pair wraps into the middle of the message rather than onto its own
// trailing line, so this is searched anywhere in the name and then cut out.
const COLOR = /\((White|Blue|Cyan|Amber|Red|Green)\s*[–-]\s*(\w+)\)/;

const CAS_HDR = /^(\s*)Item #\s+Item\s+Dispatch Consideration\s*$/;
const CAT_HDR = /^\s*Repair Category\s*$/;
const CAS_ID = /^(\d+-\d+)$/;

const NEF_HDR = /^(\s*)Item #\s+Item Name\s+\(M\)\(O\) Procedures\s*$/;
// One row is numbered "N200-31N" — the suffix letter is part of the item number.
const NEF_ID = /^(N\d{3}-\d+[A-Z]?)$/;
const AREA = /^\s*([A-Z][A-Z ,/&]+)\s*\((\d00)\)\s*$/;
const PROC_SPLIT = /\((M|O)\)\s*/;

// DERIVED (1 of 2): the NEF Deferral List page header states the placard rule once, for
// every item on the list. Carried verbatim onto each row rather than restated.
const NEF_PLACARD_TEXT =
  'Place MEL Placard in a Prominent Location Visible by the Flight Crew. ' +
  'Place MEL Placard near affected NEF Item as necessary.';

function isoDate(m: RegExpMatchArray): string {
  return `20${m[4]}-${m[2]}-${m[3]}`;
}

/** Rejoin a word the PDF broke across lines at a hyphen: "L- R" -> "L-R". */
function unwrap(text: string): string {
  return text.replace(/(\w)- (?=\w)/g, '$1-');
}

function tidy(lines: string[]): string {
  const out: string[] = [];
  let buf: string[] = [];
  for (const ln of lines) {
    if (ln.trim()) buf.push(ln.trim());
    else if (buf.length) {
      out.push(buf.join(' '));
      buf = [];
    }
  }
  if (buf.length) out.push(buf.join(' '));
  return out.join(' ').trim();
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b[a-z]/g, c => c.toUpperCase());
}

function melRevision(rev: string | null): string {
  return rev && rev !== 'Original' ? `Rev ${rev}` : 'Original';
}

interface RawCas {
  itemNumber: string;
  name: string[];
  category: string;
  dispatch: string[];
  inheritedMessage?: boolean;
  blocks: Record<string, string>;
  rev: string | null;
  eff: string | null;
}

interface RawNef {
  itemNumber: string;
  name: string[];
  proc: string[];
  area: string | null;
  rev: string | null;
  eff: string | null;
}

// ── Section Two: CAS Message Relief ──────────────────────────────────────────

function parseCas(lines: string[], actype: AircraftType) {
  const items: RawCas[] = [];
  const warnings: string[] = [];
  let rev: string | null = null;
  let eff: string | null = null;
  let i = 0;
  const n = lines.length;

  while (i < n) {
    const line = lines[i];
    const rm = line.match(REV);
    if (rm) {
      rev = rm[1];
      eff = isoDate(rm);
    }

    if (!CAS_HDR.test(line)) {
      i += 1;
      continue;
    }

    // Column geometry from this page's own header pair.
    const nameCol = line.indexOf('Item', line.indexOf('Item #') + 6);
    const dispCol = line.indexOf('Dispatch Consideration');
    let catCol: number | null = null;
    for (let back = 1; back < 4; back += 1) {
      if (i - back >= 0 && CAT_HDR.test(lines[i - back])) {
        catCol = lines[i - back].indexOf('Repair Category');
        break;
      }
    }
    if (catCol === null || !(nameCol < catCol && catCol < dispCol)) {
      warnings.push(`${actype}: unreadable column geometry at line ${i + 1}`);
      i += 1;
      continue;
    }

    const pageItems: RawCas[] = [];
    let cur: RawCas | null = null;
    let j = i + 1;
    while (j < n) {
      const ln = lines[j];
      if (FOOTER.test(ln) || CAS_HDR.test(ln) || CAT_HDR.test(ln)) break;
      if (ln.startsWith('Operations (O)') || ln.startsWith('Maintenance (M)')) break;
      if (CENTERED_NOISE.test(ln)) {
        j += 1;
        continue;
      }

      const head = ln.slice(0, nameCol).trim();
      if (CAS_ID.test(head)) {
        cur = {
          itemNumber: head,
          name: [ln.slice(nameCol, catCol).trim()],
          category: ln.slice(catCol, dispCol).trim(),
          dispatch: [ln.slice(dispCol).trimEnd()],
          blocks: {},
          rev,
          eff,
        };
        pageItems.push(cur);
      } else if (cur !== null) {
        const left = ln.slice(nameCol, catCol).trim();
        const right = ln.slice(dispCol).trimEnd();
        if (left) cur.name.push(left);
        if (right.trim()) cur.dispatch.push(right);
      }
      j += 1;
    }

    // Trailing Operations (O) / Maintenance (M) blocks belong to this page.
    const blocks: Record<string, string> = {};
    while (j < n) {
      const ln = lines[j];
      if (FOOTER.test(ln) || CAS_HDR.test(ln) || CAT_HDR.test(ln)) break;
      let key: string | null = null;
      if (ln.startsWith('Operations (O)')) key = 'O';
      else if (ln.startsWith('Maintenance (M)')) key = 'M';
      if (key) {
        const body: string[] = [];
        j += 1;
        while (j < n) {
          const b = lines[j];
          if (
            FOOTER.test(b) ||
            CAS_HDR.test(b) ||
            CAT_HDR.test(b) ||
            b.startsWith('Operations (O)') ||
            b.startsWith('Maintenance (M)')
          )
            break;
          if (!CENTERED_NOISE.test(b)) body.push(b.trimEnd());
          j += 1;
        }
        blocks[key] = tidy(body);
        continue;
      }
      j += 1;
    }

    // A sub-variant row leaves the Item column blank and sits directly under the row whose
    // message it shares — e.g. 2-32 under "2-31 Wing Anti-Ice Maint Reqd, L-R", the
    // both-sides variant of the same message. It inherits the message text, never a repair
    // category or a proviso, which it always states for itself.
    pageItems.forEach((it, k) => {
      if (!it.name.join('').trim() && k > 0) {
        it.name = [...pageItems[k - 1].name];
        it.inheritedMessage = true;
      }
    });

    for (const it of pageItems) {
      it.blocks = blocks;
      it.rev = rev;
      it.eff = eff;
    }
    if (Object.keys(blocks).length > 0 && pageItems.length > 1) {
      const marked = pageItems.filter(it => /\((O|M)\)/.test(it.dispatch.join(' ')));
      if (marked.length !== 1) {
        warnings.push(
          `${actype}: page with ${pageItems.length} items shares an (O)/(M) block ` +
            `(${pageItems.map(it => it.itemNumber).join(', ')}) — attached to ` +
            `${marked.length} marked item(s)`,
        );
      }
      for (const it of pageItems) {
        if (!marked.includes(it)) it.blocks = {};
      }
    }

    items.push(...pageItems);
    i = j;
  }

  return { items: items.map(it => toCasMelItem(it, actype)), warnings, rev, eff };
}

function toCasMelItem(it: RawCas, actype: AircraftType): MelItem {
  let message = it.name.filter(Boolean).join(' ').trim();
  let color: CasColor | undefined;
  let level: CasLevel | undefined;
  const cm = message.match(COLOR);
  if (cm && cm.index !== undefined) {
    color = cm[1].toUpperCase() as CasColor;
    level = cm[2].toUpperCase() as CasLevel;
    message = `${message.slice(0, cm.index)} ${message.slice(cm.index + cm[0].length)}`.trim();
  }
  // A message continued across a page break repeats the item number under a "(Continued)"
  // marker; the marker is page furniture, not part of the message.
  message = message.replace(/\(Continued\)/g, '');
  message = unwrap(message.replace(/\s{2,}/g, ' ')).replace(/^[\s–-]+|[\s–-]+$/g, '');

  const out: MelItem = {
    id: `mel-${actype.toLowerCase()}-cas-${it.itemNumber}`,
    aircraftType: actype,
    mmelRevision: melRevision(it.rev),
    effectiveDate: it.eff ?? '',
    approvalState: 'DRAFT',
    melSection: 'TWO',
    ataReference: '', // Section Two is keyed by CAS message, not ATA. Not inferred.
    itemNumber: it.itemNumber,
    subItemNumber: it.itemNumber,
    title: message,
    category: (['A', 'B', 'C', 'D'] as const).includes(it.category as MelCategory)
      ? (it.category as MelCategory)
      : null,
    numberInstalled: null,
    numberRequired: null,
    casMessage: message,
  };
  if (color) {
    out.casColor = color;
    out.casLevel = level;
  }
  const provisos = tidy(it.dispatch);
  if (provisos) out.provisos = provisos;
  if (it.blocks.O) out.oProcedure = it.blocks.O;
  if (it.blocks.M) out.mProcedure = it.blocks.M;
  return out;
}

// ── NEF Deferral List ────────────────────────────────────────────────────────

function parseNef(lines: string[], actype: AircraftType) {
  const items: RawNef[] = [];
  const warnings: string[] = [];
  let rev: string | null = null;
  let eff: string | null = null;
  let area: string | null = null;
  let i = 0;
  const n = lines.length;

  while (i < n) {
    const line = lines[i];
    const rm = line.match(REV);
    if (rm) {
      rev = rm[1];
      eff = isoDate(rm);
    }
    const am = line.match(AREA);
    if (am) area = `${titleCase(am[1].trim())} (${am[2]})`;

    if (!NEF_HDR.test(line)) {
      i += 1;
      continue;
    }

    const nameCol = line.indexOf('Item Name');
    const procCol = line.indexOf('(M)(O) Procedures');
    let cur: RawNef | null = null;
    let j = i + 1;
    while (j < n) {
      const ln = lines[j];
      if (FOOTER.test(ln) || NEF_HDR.test(ln)) break;
      const am2 = ln.match(AREA);
      if (am2) {
        area = `${titleCase(am2[1].trim())} (${am2[2]})`;
        j += 1;
        continue;
      }
      if (CENTERED_NOISE.test(ln)) {
        j += 1;
        continue;
      }

      const head = ln.slice(0, nameCol).trim();
      if (NEF_ID.test(head)) {
        cur = {
          itemNumber: head,
          name: [ln.slice(nameCol, procCol).trim()],
          proc: [ln.slice(procCol).trimEnd()],
          area,
          rev,
          eff,
        };
        items.push(cur);
      } else if (cur !== null) {
        const left = ln.slice(nameCol, procCol).trim();
        const right = ln.slice(procCol).trimEnd();
        if (left) cur.name.push(left);
        if (right.trim()) cur.proc.push(right);
      }
      j += 1;
    }
    i = j;
  }

  return { items: items.map(it => toNefMelItem(it, actype)), warnings, rev, eff };
}

function toNefMelItem(it: RawNef, actype: AircraftType): MelItem {
  const name = unwrap(it.name.filter(Boolean).join(' ').trim());
  const body = tidy(it.proc);

  let condition: string | null = null;
  let oProc: string | null = null;
  let mProc: string | null = null;
  const parts = body.split(PROC_SPLIT);
  if (parts.length && parts[0].trim()) condition = parts[0].trim();
  for (let k = 1; k < parts.length - 1; k += 2) {
    const text = parts[k + 1].trim();
    if (parts[k] === 'M') mProc = text;
    else oProc = text;
  }

  const keep = (v: string | null) =>
    v && v.replace(/\.+$/, '').trim().toLowerCase() !== 'none' ? v : null;

  const out: MelItem = {
    id: `mel-${actype.toLowerCase()}-nef-${it.itemNumber.toLowerCase()}`,
    aircraftType: actype,
    mmelRevision: melRevision(it.rev),
    effectiveDate: it.eff ?? '',
    approvalState: 'DRAFT',
    melSection: 'NEF',
    // The NEF program's authority is MMEL/MEL item 25-22 (ATA 25 Equipment / Furnishings),
    // which is where the FAA grants it. Stated in the document.
    ataReference: '25',
    itemNumber: it.itemNumber,
    subItemNumber: it.itemNumber,
    title: name,
    // NEF carries no repair category: "repaired at the earliest opportunity" (D69).
    category: null,
    numberInstalled: null,
    numberRequired: null,
    nefArea: it.area ?? undefined,
    placardText: NEF_PLACARD_TEXT,
    // DERIVED (2 of 2): MEL item 25-22-01, the item that grants the NEF program its
    // authority, is marked "Flight Crew Deferral Item: YES" in both MELs.
    flightCrewDeferral: true,
  };
  if (keep(mProc)) out.mProcedure = mProc as string;
  if (keep(oProc)) out.oProcedure = oProc as string;
  if (condition) out.provisos = condition;
  return out;
}

// ── Document ─────────────────────────────────────────────────────────────────

export function parseMelDocument(lines: string[], actype: AircraftType): ParseResult {
  const cas = parseCas(lines, actype);
  const nef = parseNef(lines, actype);
  const warnings = [...cas.warnings, ...nef.warnings];
  let items = [...cas.items, ...nef.items];

  // N900-1..8 are the blank write-in slots the paper NEF Checklist is signed into
  // ("Additional Items Added Upon Completion of NEF Check List"). They carry no item, so
  // they are form furniture, not catalog entries. D95 records why this does not conflict
  // with D69's NEF eligibility flow: those slots are that flow's paper artefact.
  items = items.filter(it => !it.itemNumber.startsWith('N900'));

  // An item whose table runs over a page break is emitted twice under the same item
  // number. Fold the later fragment into the first rather than shipping both.
  const merged = new Map<string, MelItem>();
  for (const it of items) {
    const prior = merged.get(it.id);
    if (!prior) {
      merged.set(it.id, it);
      continue;
    }
    for (const field of ['provisos', 'oProcedure', 'mProcedure'] as const) {
      const next = it[field];
      if (next) prior[field] = prior[field] ? `${prior[field]} ${next}`.trim() : next;
    }
    if (!prior.title && it.title) {
      prior.title = it.title;
      prior.casMessage = it.title;
    }
    for (const field of ['casColor', 'casLevel', 'category'] as const) {
      if (prior[field] == null && it[field] != null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prior as any)[field] = it[field];
      }
    }
  }
  items = [...merged.values()];

  const empty = items.filter(it => !it.title.trim()).map(it => it.id);
  if (empty.length) {
    warnings.push(`${empty.length} items with no title survived merge: ${empty.join(', ')}`);
  }
  const missingColor = items
    .filter(it => it.melSection === 'TWO' && !it.casColor)
    .map(it => it.id);
  if (missingColor.length) {
    warnings.push(
      `${missingColor.length} Section Two items with no annunciation colour: ${missingColor.join(', ')}`,
    );
  }

  return {
    items,
    warnings,
    revision: cas.rev ?? nef.rev,
    effectiveDate: cas.eff ?? nef.eff,
  };
}

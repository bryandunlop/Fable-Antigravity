// LG-117 — a date-only field is a calendar day, not an instant.
//
// `new Date('2024-11-01')` is UTC midnight per ECMA-262, so toLocaleDateString()
// renders Oct 31 anywhere west of Greenwich. This shipped: PB-001 read "Nov 1, 2024"
// in the Document Center and "10/31/2024" on the legacy bulletins page, the printed
// copy, and the .docx export. Two of those four were correct only because they had
// spelled the fix out inline — which is why the other two were wrong.
//
// A unit test on the formatter cannot catch a NEW call site that reverts to bare
// parsing, so this audits the source instead. It is deliberately scoped to the
// documents module: effective/expiration/ack-due dates are regulatory attributes of a
// controlled publication, and the printed copy is what ends up in a binder.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src/components/documents';

/** Fields the model stores as YYYY-MM-DD. */
const DATE_ONLY_FIELDS = [
  'effectiveDate',
  'expirationDate',
  'ackDueDate',
  'nextReviewDate',
  'lastUpdatedDate',
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    if (!/\.tsx?$/.test(name) || /\.test\.tsx?$/.test(name)) return [];
    return [p];
  });
}

describe('LG-117 — date-only fields never go through bare new Date()', () => {
  it('finds source to audit', () => {
    expect(sourceFiles(ROOT).length).toBeGreaterThan(20);
  });

  it.each(DATE_ONLY_FIELDS)('no bare new Date(...%s...) anywhere in documents/', (field) => {
    // Matches `new Date(rev.effectiveDate)` and `new Date(`${x.ackDueDate}T00:00:00`)`.
    // The template-literal form is CORRECT today but is the duplication that let the
    // module drift — formatDateOnly is the one way, so both shapes fail here.
    const bare = new RegExp(String.raw`new Date\(\s*[^)]*\b${field}\b`);
    const offenders = sourceFiles(ROOT)
      .filter((f) => bare.test(readFileSync(f, 'utf8')))
      .map((f) => f.replace(`${ROOT}/`, ''));
    expect(offenders, `use formatDateOnly() from lib/operatorDate for ${field}`).toEqual([]);
  });

  it('real timestamps are still parsed as instants — this rule is not "never use new Date"', () => {
    // *AtUtc fields ARE instants and must render in the reader's local zone. If this
    // stops matching, the audit above has been over-applied.
    const ack = readFileSync(join(ROOT, 'components/AckPanel.tsx'), 'utf8');
    expect(ack).toMatch(/new Date\(myAck\.acknowledgedAtUtc\)/);
  });
});

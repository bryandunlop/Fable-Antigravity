// Cells starting with any of these are interpreted as formulas by Excel / Sheets /
// LibreOffice (CSV injection). Prefix such a cell with a single quote so the value is
// treated as text. Covers ASCII =+-@, control chars (tab/CR/LF) and full-width variants.
// Ref: OWASP CSV Injection — see vault Reference/ref-csv-formula-injection.
const FORMULA_LEAD = /^[=+\-@\t\r\n＝＋－＠]/;

/** Serialize headers + rows to CSV text: neutralize formula injection, then quote-escape. */
export function toCsv(headers: string[], rows: string[][]): string {
  const cell = (v: string) => {
    const safe = FORMULA_LEAD.test(v) ? `'${v}` : v;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return [headers.map(cell).join(','), ...rows.map(r => r.map(cell).join(','))].join('\n');
}

export function downloadCSV(filename: string, headers: string[], rows: string[][]): void {
  const blob = new Blob([toCsv(headers, rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

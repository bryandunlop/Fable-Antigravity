/** FIR reference numbers: FIR-YYYY-NNN, sequential per calendar year (§5). */

const REF_RE = /^FIR-(\d{4})-(\d+)$/;

export function nextFirRef(existingRefs: string[], atUtc: string): string {
  const year = new Date(atUtc).getUTCFullYear();
  let max = 0;
  for (const ref of existingRefs) {
    const m = REF_RE.exec(ref);
    if (m && Number(m[1]) === year) max = Math.max(max, Number(m[2]));
  }
  return `FIR-${year}-${String(max + 1).padStart(3, '0')}`;
}

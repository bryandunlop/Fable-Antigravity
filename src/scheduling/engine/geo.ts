// ICAO prefix -> country/region code. Small, documented lookup (prototype-scope;
// a real system would use a proper airport/country database). Covers the
// checklist countries referenced by the Slice-3 international + DASSP templates.
// Two-letter prefixes are checked before single-letter ones (e.g. 'MM' before 'M').

const TWO_LETTER_PREFIXES: Record<string, string> = {
  MM: 'MX', // Mexico
  EG: 'GB', // United Kingdom
  LF: 'EU', // France
  LE: 'EU', // Spain
  LI: 'EU', // Italy
  LG: 'EU', // Greece
  WS: 'SG', // Singapore
  RP: 'PH', // Philippines
  VI: 'IN', // India
  VA: 'IN', // India
  VE: 'IN', // India
  VO: 'IN', // India
  ZB: 'CN', // China
  ZG: 'CN', // China
  ZS: 'CN', // China
  ZU: 'CN', // China
  ZP: 'CN', // China
  ZL: 'CN', // China
  ZH: 'CN', // China
  ZY: 'CN', // China
  ZW: 'CN', // China
  ZJ: 'CN', // China
};

const ONE_LETTER_PREFIXES: Record<string, string> = {
  K: 'US',
  C: 'CA',
};

export function countryForIcao(icao: string): string {
  const upper = icao.toUpperCase();
  const two = upper.slice(0, 2);
  if (TWO_LETTER_PREFIXES[two]) return TWO_LETTER_PREFIXES[two];
  const one = upper.slice(0, 1);
  if (ONE_LETTER_PREFIXES[one]) return ONE_LETTER_PREFIXES[one];
  return `OTHER:${two}`;
}

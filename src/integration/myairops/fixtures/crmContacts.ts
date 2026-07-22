// Schema-faithful CRM-API contact fixtures (typed against the generated vendor
// types). All people are fictional. lastModifiedDate values are RELATIVE to now
// so the currency scenarios hold whenever the demo runs:
//   501 Marcus Webb     modified  90d ago, passport 2031        -> CURRENT
//   502 Dana Whitfield  modified ~3.2y ago                      -> STALE
//   503 Priya Raman     modified  60d ago, passport exp now+8d  -> DOC_EXPIRING on MAO-7305 (ends +9d6h)
//   504 Elliot Kranz    modified ~2.2y ago                      -> STALE
//   505 Janae Holloway  modified  30d ago                       -> CURRENT
//   506 Tom Okafor      modified 200d ago                       -> CURRENT
//   507 Mei-Lin Chu     modified 400d ago                       -> CURRENT

import type { CrmContact } from '../crmAdapter';

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildCrmContactFixtures(nowUtcIso: string): CrmContact[] {
  const base = new Date(nowUtcIso).getTime();
  const iso = (offsetMs: number) => new Date(base + offsetMs).toISOString();

  const c = (
    id: number, firstNames: string, lastName: string, modifiedDaysAgo: number,
    passport: { number: string; expiresOffsetDays: number } | null,
    email?: string,
  ): CrmContact => ({
    id,
    fullName: `${firstNames} ${lastName}`,
    firstNames, lastName,
    primaryEmail: email ?? `${firstNames.toLowerCase().replace(/[^a-z]/g, '')}.${lastName.toLowerCase().replace(/[^a-z]/g, '')}@example.com`,
    isPassenger: true,
    isCrew: false,
    lastModifiedDate: iso(-modifiedDaysAgo * DAY_MS),
    idDocuments: passport ? [{
      id: id * 10 + 1,
      idDocumentType: { id: 1, name: 'Passport' },
      number: passport.number,
      expiryDate: iso(passport.expiresOffsetDays * DAY_MS),
      isPreferred: true,
    }] : [],
  } as CrmContact);

  return [
    c(501, 'Marcus', 'Webb', 90, { number: '498112307', expiresOffsetDays: 1650 }),
    c(502, 'Dana', 'Whitfield', 1170, { number: '541998210', expiresOffsetDays: 420 }),
    c(503, 'Priya', 'Raman', 60, { number: '663220984', expiresOffsetDays: 8 }),
    c(504, 'Elliot', 'Kranz', 800, { number: '712445067', expiresOffsetDays: 900 }),
    c(505, 'Janae', 'Holloway', 30, { number: '390118552', expiresOffsetDays: 1200 }),
    c(506, 'Tom', 'Okafor', 200, { number: '815330271', expiresOffsetDays: 700 }),
    c(507, 'Mei-Lin', 'Chu', 400, { number: '922716408', expiresOffsetDays: 1500 }),
  ];
}

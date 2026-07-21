// Pure mapping: myairops CRM API ContactModel (generated from the vendor OpenAPI doc)
// -> CrmPassengerSnapshot, the shape the passenger-currency feature consumes.
// PULL-ONLY. No PII beyond what a scheduler-facing dashboard needs: no DOB, no
// document numbers beyond a masked tail, no addresses.

import type { components } from './gen/crm';

export type CrmContact = components['schemas']['ContactModel'];
export type CrmIdDocument = components['schemas']['IdDocumentModel'];

export interface CrmDocumentSnapshot {
  id: number;
  /** Document type name as the vendor stores it (e.g. "Passport"). */
  kind: string;
  /** Last 3 characters only — enough to disambiguate on a scheduler screen. */
  numberTail?: string;
  expiresUtc: string | null;
  isPreferred: boolean;
}

export interface CrmPassengerSnapshot {
  crmContactId: number;
  fullName: string;
  email?: string;
  phone?: string;
  isPassenger: boolean;
  /**
   * Vendor-side record-modified stamp. ADVISORY freshness only: it moves when
   * anyone edits the record for any reason. myGFO's own passenger-confirmed
   * timestamp (the LG-21 outreach loop) is the real currency signal; until that
   * exists this is the best available proxy and is labelled as such in the UI.
   */
  lastModifiedUtc: string | null;
  documents: CrmDocumentSnapshot[];
}

function toId(v: number | string | null | undefined, ctx: string): number {
  const n = typeof v === 'string' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error(`${ctx}: missing/invalid id`);
  return n;
}

function mapDocument(d: CrmIdDocument, ctx: string): CrmDocumentSnapshot {
  return {
    id: toId(d.id, `${ctx}.document`),
    kind: d.idDocumentType?.name ?? 'Document',
    ...(d.number ? { numberTail: `…${d.number.slice(-3)}` } : {}),
    expiresUtc: d.expiryDate ?? null,
    isPreferred: d.isPreferred ?? false,
  };
}

export function mapCrmContactToSnapshot(c: CrmContact): CrmPassengerSnapshot {
  const ctx = `crmContact ${String(c.fullName ?? c.id ?? '?')}`;
  return {
    crmContactId: toId(c.id, ctx),
    fullName: c.fullName ?? ([c.firstNames, c.lastName].filter(Boolean).join(' ') || `Contact ${String(c.id)}`),
    ...(c.primaryEmail ? { email: c.primaryEmail } : {}),
    ...(c.primaryTelephone ? { phone: c.primaryTelephone } : {}),
    isPassenger: c.isPassenger ?? false,
    lastModifiedUtc: c.lastModifiedDate ?? null,
    documents: (c.idDocuments ?? []).map(d => mapDocument(d, ctx)),
  };
}

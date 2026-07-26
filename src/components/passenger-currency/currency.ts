// Pure passenger-currency assessment (LG-21 dashboard half): upcoming trip
// manifests × CRM passenger snapshots -> per-passenger currency findings.
// PULL-ONLY inputs; the outbound email + any CRM write-back are deliberately
// NOT here — they are gated on the pull-only-rule decision (see LG-21).

import type { CrmPassengerSnapshot } from '../../integration/myairops/crmAdapter';
import { STALE_AFTER_MS } from './policy';

export interface TripManifestInput {
  tripId: string;
  tripNumber: string;
  tail: string;
  firstEtdUtc: string;
  tripEndUtc: string;
  passengers: Array<{ name: string; crmPassengerId: number | null }>;
}

export type PassengerCurrencyStatus = 'UNMATCHED' | 'DOC_EXPIRING' | 'STALE' | 'CURRENT';

export interface PassengerCurrencyFinding {
  name: string;
  crmContactId?: number;
  email?: string;
  status: PassengerCurrencyStatus;
  /** CRM record-modified stamp — advisory freshness proxy (see policy.ts). */
  lastModifiedUtc?: string;
  docKind?: string;
  docTail?: string;
  docExpiresUtc?: string;
  reasons: string[];
}

export interface TripCurrencyGroup {
  tripId: string;
  tripNumber: string;
  tail: string;
  firstEtdUtc: string;
  tripEndUtc: string;
  passengers: PassengerCurrencyFinding[];
  needsActionCount: number;
}

function preferredDoc(snapshot: CrmPassengerSnapshot) {
  return snapshot.documents.find(d => d.isPreferred) ?? snapshot.documents[0];
}

function assessPassenger(
  name: string,
  crmPassengerId: number | null,
  trip: TripManifestInput,
  byId: Map<number, CrmPassengerSnapshot>,
  nowMs: number,
): PassengerCurrencyFinding {
  const snapshot = crmPassengerId !== null ? byId.get(crmPassengerId) : undefined;
  if (!snapshot) {
    return {
      name,
      status: 'UNMATCHED',
      reasons: ['On the manifest with no linked CRM passenger record — identity and documents unverifiable'],
    };
  }

  const base: Omit<PassengerCurrencyFinding, 'status' | 'reasons'> = {
    name: snapshot.fullName,
    crmContactId: snapshot.crmContactId,
    ...(snapshot.email ? { email: snapshot.email } : {}),
    ...(snapshot.lastModifiedUtc ? { lastModifiedUtc: snapshot.lastModifiedUtc } : {}),
  };

  const doc = preferredDoc(snapshot);
  const docFields = doc
    ? {
        docKind: doc.kind,
        ...(doc.numberTail ? { docTail: doc.numberTail } : {}),
        ...(doc.expiresUtc ? { docExpiresUtc: doc.expiresUtc } : {}),
      }
    : {};

  if (doc?.expiresUtc && doc.expiresUtc <= trip.tripEndUtc) {
    return {
      ...base, ...docFields,
      status: 'DOC_EXPIRING',
      reasons: [`${doc.kind} expires before the trip ends`],
    };
  }

  const reasons: string[] = [];
  if (!doc) reasons.push('No travel document on file');
  if (!snapshot.lastModifiedUtc) {
    reasons.push('CRM record has no modification date — freshness unknown');
  } else if (nowMs - new Date(snapshot.lastModifiedUtc).getTime() > STALE_AFTER_MS) {
    reasons.push('CRM record not updated in over 2 years');
  }
  if (reasons.length > 0) return { ...base, ...docFields, status: 'STALE', reasons };

  return { ...base, ...docFields, status: 'CURRENT', reasons: [] };
}

export function assessTripPassengerCurrency(
  trips: TripManifestInput[],
  snapshots: CrmPassengerSnapshot[],
  nowUtc: string,
): TripCurrencyGroup[] {
  const nowMs = new Date(nowUtc).getTime();
  const byId = new Map(snapshots.map(s => [s.crmContactId, s]));

  return trips
    .filter(t => t.tripEndUtc >= nowUtc)
    .sort((a, b) => a.firstEtdUtc.localeCompare(b.firstEtdUtc))
    .map(trip => {
      const passengers = trip.passengers
        .map(p => assessPassenger(p.name, p.crmPassengerId, trip, byId, nowMs))
        .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || a.name.localeCompare(b.name));
      return {
        tripId: trip.tripId,
        tripNumber: trip.tripNumber,
        tail: trip.tail,
        firstEtdUtc: trip.firstEtdUtc,
        tripEndUtc: trip.tripEndUtc,
        passengers,
        needsActionCount: passengers.filter(p => p.status !== 'CURRENT').length,
      };
    });
}

const STATUS_RANK: Record<PassengerCurrencyStatus, number> = {
  DOC_EXPIRING: 0,
  UNMATCHED: 1,
  STALE: 2,
  CURRENT: 3,
};

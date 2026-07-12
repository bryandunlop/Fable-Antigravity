import type { FirAnchor, FirCategory, FirImpact, FlightIrregularityReport } from '../types';

export interface OpenFirInput {
  id: string;
  ref: string;
  title: string;
  category: FirCategory;
  openedBy: { oid: string; name?: string };
  atUtc: string;
  eventStartUtc: string;
  eventEndUtc?: string;
  aircraftId?: string;
  anchors?: FirAnchor[];
  impact?: FirImpact;
}

/** Open an FIR (§4): status OPEN, owner defaults to opener, OPENED audit event. */
export function buildFir(input: OpenFirInput): FlightIrregularityReport {
  return {
    id: input.id,
    ref: input.ref,
    title: input.title,
    category: input.category,
    status: 'OPEN',
    openedByOid: input.openedBy.oid,
    openedByName: input.openedBy.name,
    ownerOid: input.openedBy.oid,
    ownerName: input.openedBy.name,
    openedAtUtc: input.atUtc,
    eventStartUtc: input.eventStartUtc,
    eventEndUtc: input.eventEndUtc,
    aircraftId: input.aircraftId,
    anchors: input.anchors ?? [],
    narrative: '',
    impact: input.impact ?? {},
    manualTimeline: [],
    statements: [],
    relatedSafetyItems: [],
    audit: [{ kind: 'OPENED', atUtc: input.atUtc, byOid: input.openedBy.oid, byName: input.openedBy.name }],
  };
}

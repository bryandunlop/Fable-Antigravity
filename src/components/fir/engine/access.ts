import type { FlightIrregularityReport, PerspectiveStatement } from '../types';

/** Leadership tier (§7): sees every FIR from the moment it opens. Demo mapping —
 * no dedicated VP role exists in navConfig; 'vp' (an additional role) is included
 * so a VP login lands in the tier. Exact production membership is Open Q2 (§12). */
export const FIR_LEADERSHIP_ROLES = ['dom', 'chief-pilot', 'lead', 'admin', 'vp'] as const;

export interface FirViewer {
  oid: string;
  roles: string[];
}

export function isFirLeadership(roles: string[]): boolean {
  return roles.some(r => (FIR_LEADERSHIP_ROLES as readonly string[]).includes(r));
}

/** True when the viewer has an outstanding or answered statement on this FIR. */
export function isFirRequestee(fir: FlightIrregularityReport, oid: string): boolean {
  return fir.statements.some(s => s.requestedOfOid === oid);
}

/** Internal FIR visibility (§7): leadership tier + owner (+ the original opener),
 * plus a requestee — who gets a scoped view (their own request + the timeline for
 * context, never the narrative/impact or other people's statements). The
 * all-employees surface is the curated published version — slice 3. */
export function canSeeFir(fir: FlightIrregularityReport, viewer: FirViewer): boolean {
  if (isFirLeadership(viewer.roles)) return true;
  return fir.ownerOid === viewer.oid || fir.openedByOid === viewer.oid || isFirRequestee(fir, viewer.oid);
}

export function visibleFirs(firs: FlightIrregularityReport[], viewer: FirViewer): FlightIrregularityReport[] {
  return firs.filter(f => canSeeFir(f, viewer));
}

/** Statement visibility (§7): leadership + owner see every statement; anyone else
 * (a requestee, or the opener who is no longer owner) sees only their own. */
export function visibleStatements(fir: FlightIrregularityReport, viewer: FirViewer): PerspectiveStatement[] {
  if (isFirLeadership(viewer.roles) || fir.ownerOid === viewer.oid) return fir.statements;
  return fir.statements.filter(s => s.requestedOfOid === viewer.oid);
}

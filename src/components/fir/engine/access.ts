import type { FlightIrregularityReport } from '../types';

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

/** Internal FIR visibility (§7): leadership tier + owner (+ the original opener).
 * The all-employees surface is the curated published version — slice 3. */
export function canSeeFir(fir: FlightIrregularityReport, viewer: FirViewer): boolean {
  if (isFirLeadership(viewer.roles)) return true;
  return fir.ownerOid === viewer.oid || fir.openedByOid === viewer.oid;
}

export function visibleFirs(firs: FlightIrregularityReport[], viewer: FirViewer): FlightIrregularityReport[] {
  return firs.filter(f => canSeeFir(f, viewer));
}

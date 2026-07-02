import { describe, it, expect } from 'vitest';
import { reconcileDiscrepancies } from './reconcile';
import type { CampDiscrepancy } from './campClient';
import type { CampCorrelation } from '../types';

const disc = (id: string): CampDiscrepancy => ({
  discrepancyId: id, ata: '21', description: id, discrepancyType: 'NON-DEFERRED', status: 'Open',
});

describe('reconcileDiscrepancies', () => {
  it('matches a pushed ref present in CAMP', () => {
    const corr: CampCorrelation[] = [{ mygfoEntityId: 'D1', entityType: 'DEFECT', campDiscrepancyRef: 'CAMP-DISC-21-1', pushState: 'PUSHED' }];
    const r = reconcileDiscrepancies([disc('CAMP-DISC-21-1')], corr);
    expect(r.matched.map(d => d.discrepancyId)).toEqual(['CAMP-DISC-21-1']);
    expect(r.campOnly).toHaveLength(0);
    expect(r.mygfoOnly).toHaveLength(0);
  });

  it('flags a CAMP-only discrepancy with no myGFO correlation', () => {
    const r = reconcileDiscrepancies([disc('CAMP-DISC-25-9')], []);
    expect(r.campOnly.map(d => d.discrepancyId)).toEqual(['CAMP-DISC-25-9']);
    expect(r.matched).toHaveLength(0);
  });

  it('flags a myGFO-only correlation not present in CAMP (failed push)', () => {
    const corr: CampCorrelation[] = [{ mygfoEntityId: 'D2', entityType: 'DEFERRAL', pushState: 'FAILED', lastError: 'boom' }];
    const r = reconcileDiscrepancies([], corr);
    expect(r.mygfoOnly).toHaveLength(1);
    expect(r.matched).toHaveLength(0);
    expect(r.campOnly).toHaveLength(0);
  });

  it('treats a PUSHED correlation whose ref CAMP no longer shows as myGFO-only', () => {
    const corr: CampCorrelation[] = [{ mygfoEntityId: 'D3', entityType: 'DEFECT', campDiscrepancyRef: 'CAMP-DISC-32-7', pushState: 'PUSHED' }];
    const r = reconcileDiscrepancies([disc('CAMP-DISC-99-0')], corr);
    expect(r.mygfoOnly.map(c => c.mygfoEntityId)).toEqual(['D3']);
    expect(r.campOnly.map(d => d.discrepancyId)).toEqual(['CAMP-DISC-99-0']);
  });

  it('surfaces an in-flight PENDING push (no ref yet) as myGFO-only, not matched', () => {
    // Only a PUSHED correlation counts as matched; a PENDING push has no CAMP ref yet.
    const corr: CampCorrelation[] = [{ mygfoEntityId: 'D4', entityType: 'DEFECT', pushState: 'PENDING' }];
    const r = reconcileDiscrepancies([disc('CAMP-DISC-25-9')], corr);
    expect(r.matched).toHaveLength(0);
    expect(r.mygfoOnly.map(c => c.mygfoEntityId)).toEqual(['D4']);
    expect(r.campOnly.map(d => d.discrepancyId)).toEqual(['CAMP-DISC-25-9']);
  });
});

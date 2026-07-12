import { describe, it, expect } from 'vitest';
import { getSeedState } from './mockData';
import { getDefaultState } from '../tech-log/mockData/scenarios';
import { deriveSystemEntries } from './engine/timeline';
import { nextFirRef } from './engine/refs';

describe('FIR seed state', () => {
  const nowMs = Date.parse('2026-07-11T12:00:00.000Z');
  const seed = getSeedState(nowMs);

  it('seeds FIRs whose refs continue cleanly from nextFirRef', () => {
    expect(seed.firs.length).toBeGreaterThanOrEqual(2);
    const refs = seed.firs.map(f => f.ref);
    expect(new Set(refs).size).toBe(refs.length);
    // A newly opened FIR gets the next number after the seeds, not a collision.
    const next = nextFirRef(refs, new Date(nowMs).toISOString());
    expect(refs).not.toContain(next);
  });

  it('the AOG seed anchors to the tech-log seed grounding defect and yields SYSTEM evidence', () => {
    const aog = seed.firs.find(f => f.anchors.some(a => a.refId === 'd-n1pg'))!;
    expect(aog.anchors).toContainEqual({ kind: 'DEFECT', refId: 'd-n1pg' });
    const techLog = getDefaultState(nowMs);
    const entries = deriveSystemEntries(aog, techLog, new Date(nowMs).toISOString());
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every(e => e.source === 'SYSTEM')).toBe(true);
  });

  it('every seed is internally consistent: valid status, owner set, manual entries MANUAL', () => {
    for (const f of seed.firs) {
      expect(['OPEN', 'IN_REVIEW', 'PUBLISHED', 'CLOSED_INTERNAL']).toContain(f.status);
      expect(f.ownerOid).toBeTruthy();
      expect(f.audit.some(a => a.kind === 'OPENED')).toBe(true);
      expect(f.manualTimeline.every(e => e.source === 'MANUAL')).toBe(true);
    }
  });

  it('the published seed carries an approved revision and a curation draft is staged on the open AOG', () => {
    const published = seed.firs.find(f => f.status === 'PUBLISHED')!;
    expect(published.publishedRevision).toBeDefined();
    expect(published.publishedRevision!.approvedByOid).toBeTruthy();
    expect(published.publishedRevision!.approvedByOid).not.toBe(published.reviewSubmittedByOid); // four-eyes
    const openAog = seed.firs.find(f => f.status === 'OPEN' && f.pendingPublished);
    expect(openAog?.pendingPublished?.summary).toBeTruthy();
  });
});

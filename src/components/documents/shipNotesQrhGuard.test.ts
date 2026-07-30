import { describe, it, expect } from 'vitest';
import { casKnowledgeSeed, getSeedState } from './mockData';
import { currentRevision } from './engine/revisions';
import { SHIP_NOTE_SECTIONS } from './classes';

/**
 * D64's scoped safety rule, as a test rather than a comment.
 *
 * **No numbered step sequence may appear inside a `Messages & faults` entry.** That section is
 * where a reader arrives holding an annunciation, and under workload a numbered list of actions is
 * exactly what an approved abnormal procedure looks like. Curated field experience must not be
 * mistakeable for the QRH.
 *
 * The rule is deliberately SCOPED, and an earlier draft of D64 got this wrong by banning numbered
 * steps everywhere — which would have forbidden the wifi-reset and bed-setup cards Bryan actually
 * asked for. Ground and cabin tasks are not annunciation responses, so they are not just allowed
 * there, they are the point. This test pins both halves: the ban where it belongs, and the
 * permission where it belongs.
 */
describe('D64 — the scoped QRH guard', () => {
  const { docs, revisions } = casKnowledgeSeed();
  const stepBlocksIn = (docId: string) =>
    (currentRevision(docId, revisions)?.sections ?? []).flatMap((s) => s.blocks).filter((b) => b.type === 'step');

  it('no seeded Messages & faults entry carries a numbered step sequence', () => {
    const offenders = docs
      .filter((d) => d.category === 'Messages & faults')
      .filter((d) => stepBlocksIn(d.id).length > 0)
      .map((d) => `${d.id} (${d.title})`);
    expect(offenders).toEqual([]);
  });

  it('cabin and ground tasks DO use step cards — the rule is scoped, not a blanket ban', () => {
    const withSteps = docs.filter((d) => stepBlocksIn(d.id).length > 0);
    expect(withSteps.length).toBeGreaterThan(0);
    expect(withSteps.every((d) => d.category !== 'Messages & faults')).toBe(true);
    // Bryan's own two examples, so the shape is demonstrably real and not just permitted.
    const titles = withSteps.map((d) => d.title).join(' | ');
    expect(titles).toMatch(/wifi/i);
    expect(titles).toMatch(/bed/i);
  });

  it('every fleet-scoped seed sits in a real section, or it is invisible on the tail page', () => {
    const fleetScoped = revisions.filter((r) => r.fleetTypes?.length).map((r) => r.docId);
    const bad = docs
      .filter((d) => fleetScoped.includes(d.id))
      .filter((d) => !(SHIP_NOTE_SECTIONS as readonly string[]).includes(d.category))
      .map((d) => `${d.id}: ${d.category}`);
    expect(bad).toEqual([]);
  });

  it('the controlled nav-database SOP is fleet-scoped, so D64\'s split is real and not just written down', () => {
    const seed = getSeedState();
    const sop = seed.docs.find((d) => d.id === 'SOP-003');
    expect(sop?.classId).toBe('sop');
    const rev = currentRevision('SOP-003', seed.revisions);
    expect(rev?.status).toBe('published');
    expect(rev?.fleetTypes).toContain('G650ER');
  });

  it('the nuisance list carries CMC rows and no CAS meta — different vocabularies, kept apart', () => {
    const rev = currentRevision('TK-911', revisions);
    expect(rev?.cmcRows?.length).toBeGreaterThan(0);
    expect(rev?.casMeta).toBeUndefined();
  });
});

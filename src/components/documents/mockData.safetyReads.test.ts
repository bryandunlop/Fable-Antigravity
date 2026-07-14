import { describe, it, expect } from 'vitest';
import { getSeedState } from './mockData';
import { unacknowledgedRequiredReads } from './engine/acknowledgments';
import { resolveUserId } from '../../notifications/identity';

// TL-6 / D29: Safety Center's read-and-sign is served by the Documents engine.
// The safety-specific "SMS Manual — Revision G" read is seeded as an engine Doc so
// the unified required-reads list (RequiredReadsList) surfaces it for the crew,
// with a clean read-and-initial path via DocReader/AckPanel (a '/documents' route).
describe('safety read seeded into the Documents engine (TL-6 / D29)', () => {
  const seed = getSeedState();

  it('seeds SMS Manual — Revision G as a published, initials-level required read on the /documents reader route', () => {
    const doc = seed.docs.find((d) => d.id === 'GOM-SMS');
    expect(doc).toBeTruthy();
    // 'manual' class routes to /documents → DocReader/AckPanel (the verified ack path).
    expect(doc?.classId).toBe('manual');
    // Crew-targeted so a pilot is in the audience.
    expect(doc?.roles).toContain('pilot');

    const rev = seed.revisions.find((r) => r.docId === 'GOM-SMS');
    expect(rev?.status).toBe('published');
    expect(rev?.requireAcknowledgment).toBe(true);
    expect(rev?.ackLevel).toBe('initials');
  });

  it('surfaces the safety read to a pilot who has not acknowledged it', () => {
    const userId = resolveUserId('pilot');
    const outstanding = unacknowledgedRequiredReads(
      seed.docs,
      seed.revisions,
      seed.acknowledgments,
      'pilot',
      userId,
    );
    expect(outstanding.map((o) => o.doc.id)).toContain('GOM-SMS');
  });
});

import { describe, it, expect } from 'vitest';
import { InMemorySchedulingStore } from './memory';

describe('InMemorySchedulingStore pilot visibility', () => {
  it('starts empty, adds and removes taskDefIds', async () => {
    const s = new InMemorySchedulingStore();
    expect(await s.getPilotVisibility()).toEqual([]);
    await s.setPilotVisible('a', true);
    await s.setPilotVisible('b', true);
    expect((await s.getPilotVisibility()).sort()).toEqual(['a', 'b']);
    await s.setPilotVisible('a', false);
    expect(await s.getPilotVisibility()).toEqual(['b']);
  });

  it('setting the same id visible twice does not duplicate it', async () => {
    const s = new InMemorySchedulingStore();
    await s.setPilotVisible('a', true);
    await s.setPilotVisible('a', true);
    expect(await s.getPilotVisibility()).toEqual(['a']);
  });
});

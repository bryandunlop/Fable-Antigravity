import { describe, it, expect } from 'vitest';
import { canSupersede } from './authz';
import type { Personnel } from '../types';

const author: Personnel = { oid: 'p1', displayName: 'FO Emily Chen', role: 'PILOT', riiAuthorized: false, riiAuthorizedAta: [], active: true };
const peer: Personnel = { oid: 'p2', displayName: 'FO Other', role: 'PILOT', riiAuthorized: false, riiAuthorizedAta: [], active: true };
const supervisor: Personnel = { oid: 's1', displayName: 'Capt. John Smith', role: 'PILOT', riiAuthorized: false, riiAuthorizedAta: [], isSupervisor: true, active: true };

describe('supersede authorization (SE-1)', () => {
  it('allows the original signer to self-correct (not third-party)', () => {
    const r = canSupersede('p1', author);
    expect(r.ok).toBe(true);
    expect(r.thirdParty).toBe(false);
  });
  it('blocks an unrelated peer from correcting someone else’s record', () => {
    const r = canSupersede('p1', peer);
    expect(r.ok).toBe(false);
  });
  it('allows a supervisor to file a third-party correction with a recorded relationship', () => {
    const r = canSupersede('p1', supervisor);
    expect(r.ok).toBe(true);
    expect(r.thirdParty).toBe(true);
    expect(r.relationship).toBeTruthy();
  });
});

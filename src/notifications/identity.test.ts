import { describe, it, expect } from 'vitest';
import { resolveUserId } from './identity';
import { memoryStorage } from './storage';

describe('resolveUserId', () => {
  it('maps a login role to its SYSTEM_USERS id', () => {
    expect(resolveUserId('pilot')).toBe('USR001');       // Captain John Smith
    expect(resolveUserId('maintenance')).toBe('USR002'); // Sarah Wilson
  });

  it('falls back to a role-scoped id for unknown roles', () => {
    expect(resolveUserId('kiosk-nobody')).toBe('role:kiosk-nobody');
  });
});

describe('memoryStorage', () => {
  it('round-trips values and supports removal', () => {
    const s = memoryStorage();
    expect(s.getItem('k')).toBeNull();
    s.setItem('k', 'v');
    expect(s.getItem('k')).toBe('v');
    s.removeItem('k');
    expect(s.getItem('k')).toBeNull();
  });
});

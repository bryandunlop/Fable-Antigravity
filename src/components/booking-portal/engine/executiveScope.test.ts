import { describe, expect, it } from 'vitest';
import { isExecutiveVisitor, PORTAL_OPERATOR_ROLES } from '../BookingPortalContext';

describe('isExecutiveVisitor (D99)', () => {
  it('is true for a pure executive', () => {
    expect(isExecutiveVisitor('executive')).toBe(true);
    expect(isExecutiveVisitor('executive', ['vp'])).toBe(true);
  });

  it('is false for every portal operator role, alone or held alongside executive', () => {
    for (const role of PORTAL_OPERATOR_ROLES) {
      expect(isExecutiveVisitor(role), role).toBe(false);
      expect(isExecutiveVisitor('executive', [role]), `executive + ${role}`).toBe(false);
      expect(isExecutiveVisitor(role, ['executive']), `${role} + executive`).toBe(false);
    }
  });

  it('is false for non-executive visitors and empty input', () => {
    expect(isExecutiveVisitor('pilot')).toBe(false);
    expect(isExecutiveVisitor(undefined)).toBe(false);
    expect(isExecutiveVisitor(undefined, [])).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { COST_MODEL_ROLES, canSeeCostModel } from '../BookingPortalContext';
import { BOOKING_TOUR } from '../components/DemoTour';

describe('canSeeCostModel — Bryan 2026-08-23: lead team only', () => {
  it('admits the lead team and admins, and nobody else', () => {
    expect(canSeeCostModel('lead')).toBe(true);
    expect(canSeeCostModel('admin')).toBe(true);
    for (const role of ['admin-assistant', 'scheduling', 'pilot', 'maintenance', 'safety', 'inflight']) {
      expect(canSeeCostModel(role)).toBe(false);
    }
  });

  it('honours a lead role granted as an additional role', () => {
    expect(canSeeCostModel('scheduling', ['lead'])).toBe(true);
    expect(canSeeCostModel('scheduling', ['safety'])).toBe(false);
  });

  it('refuses when no role is supplied at all, rather than defaulting open', () => {
    expect(canSeeCostModel(undefined)).toBe(false);
    expect(canSeeCostModel('', [])).toBe(false);
    expect(canSeeCostModel(undefined, [''])).toBe(false);
  });

  it('keeps the tab list and the route check on one source', () => {
    expect(COST_MODEL_ROLES).toEqual(['lead', 'admin']);
  });
});

describe('the walkthrough respects the same gate', () => {
  const leadOnly = BOOKING_TOUR.filter((s) => s.leadOnly);

  it('marks every cost-model step lead-only, and no others', () => {
    expect(leadOnly.map((s) => s.id)).toEqual(['costmodel', 'realcost', 'idle', 'sensitivity']);
    for (const s of leadOnly) expect(s.route).toBe('/booking-portal/cost-model');
    // The inverse matters just as much: nothing else may quietly become lead-only.
    for (const s of BOOKING_TOUR.filter((x) => !x.leadOnly)) {
      expect(s.route === '/booking-portal/cost-model').toBe(false);
    }
  });

  it('leaves a coherent walkthrough for a viewer without the lead role', () => {
    const forEa = BOOKING_TOUR.filter((s) => !s.leadOnly);
    expect(forEa.length).toBe(BOOKING_TOUR.length - 4);
    expect(forEa[0].id).toBe('intro');
    expect(forEa[forEa.length - 1].id).toBe('wrap');
    // No step may point at a page the viewer would be refused.
    expect(forEa.some((s) => s.route === '/booking-portal/cost-model')).toBe(false);
  });

  it('gives every step a title and body so no filtered list can render blank', () => {
    for (const s of BOOKING_TOUR) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(0);
    }
  });
});

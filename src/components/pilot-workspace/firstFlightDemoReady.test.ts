import { describe, it, expect } from 'vitest';
import { InMemorySchedulingStore, SchedulingService, seedTemplates, seedDemoTrips } from '../../scheduling/store';
import { defaultPilotVisibleDefs } from '../../scheduling/engine';
import { seedMyairopsBookingTrips } from '../../integration/myairops/seedMyairops';
import { getDefaultState } from '../tech-log/mockData/scenarios';
import { selectPilotFlights } from './selectors';
import { groupTripsByHorizon } from './myFlights';
import { deriveDayOfQueue, beforePushProgress } from './dayOfQueue';
import { derivePaneMode } from './paneMode';
import { completedVisibleItems } from './tripPrep';

/**
 * The first card in the pilot's Flight Hub is the demo's front door — the trip everyone opens
 * first. It shipped for a while as the emptiest screen in the app ("0 legs · not released to
 * preflight · No trip prep completed yet") because the seeded myairops trip that pins to the top
 * had no tech-log mirror and an untouched coordination checklist.
 *
 * These assertions are about DEMO DATA, not product logic, and that is the point: nothing else
 * fails when the seed drifts, so the front door rots silently.
 */
describe('the first flight in the pilot Flight Hub is demo-ready', () => {
  const now = new Date().toISOString();

  async function seededStore() {
    const store = new InMemorySchedulingStore();
    const service = new SchedulingService({
      store, idFactory: (p: string) => `${p}-test`, officeTzOffsetMinutes: 0,
    });
    await seedTemplates(store);
    const visible = defaultPilotVisibleDefs(await store.listPublishedTemplates());
    for (const id of visible) await store.setPilotVisible(id, true);
    await seedDemoTrips(service, now);
    await seedMyairopsBookingTrips(service, now);
    return { store, visible };
  }

  it('pins MAO-7315 to the top of My Flights', async () => {
    const { store } = await seededStore();
    const groups = groupTripsByHorizon(selectPilotFlights(await store.listTrips(), now), now);
    expect(groups.inProgress[0]?.tripNumber).toBe('MAO-7315');
  });

  it('has a tech-log mirror, so the hub opens on a real board rather than "0 legs"', () => {
    const tlTrip = getDefaultState().trips.find((t) => t.tripNumber === 'MAO-7315');
    expect(tlTrip?.legs).toHaveLength(2);
    // Leg 1 flown and fully worked; leg 2 is the one still to fly.
    expect(tlTrip!.legs[0].fratStatus).toBe('COMPLETED');
    expect(tlTrip!.legs[0].fuelRequestId).toBeTruthy();
  });

  it('opens on the day-of pane with clickable work still owed', () => {
    const state = getDefaultState();
    const tlTrip = state.trips.find((t) => t.tripNumber === 'MAO-7315')!;
    const ac = state.aircraft.find((a) => a.id === tlTrip.aircraftId);

    expect(derivePaneMode(tlTrip.legs, now).auto).toBe('day-of');

    const queue = deriveDayOfQueue(tlTrip, ac, now);
    // A resumable FRAT draft and an airport review — two things to click, neither of them a
    // missed boundary (nothing 'locked', which would read as the demo having gone wrong).
    expect(queue.map((q) => q.kind).sort()).toEqual(['airport', 'frat']);
    expect(queue.some((q) => q.state === 'locked')).toBe(false);
    expect(queue.find((q) => q.kind === 'frat')!.state).toBe('draft');

    expect(beforePushProgress(tlTrip, ac, now).total).toBeGreaterThan(0);
  });

  it('shows completed trip prep on the Scheduling card', async () => {
    const { store, visible } = await seededStore();
    const instances = await store.listInstancesForTrip('mao-trip-7315');
    // Regression: completing "all but the last" left this empty, because the only pilot-visible
    // task def on a domestic trip is `send-crew-brief` and it sits last in checklist order.
    expect(completedVisibleItems(instances, new Set(visible)).length).toBeGreaterThan(0);
  });
});

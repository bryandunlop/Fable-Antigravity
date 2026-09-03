import { describe, expect, it } from 'vitest';
import { InMemorySchedulingStore, SchedulingService, seedTemplates } from '../store';
import { createDraft, newLeg, submitItinerary, assignTail, addLegBy, cancelTrip, bumpTrip, type Actor, type Trip } from '../../components/trips/engine/trip';
import { syncBookingsIntoStore, persistBookingInstances, restoreBookingInstances } from './projectBookings';

const EA: Actor = { name: 'Dana', role: 'ea' };
const SCHED: Actor = { name: 'R. Calloway', role: 'scheduling' };
const T0 = '2026-09-01T00:00:00.000Z';

function booking(title: string, tail: string | null = 'N2PG'): Trip {
  let t = createDraft({ title, leadPassengerId: 'P-REYES', leadPassengerName: 'A. Reyes', seatsHeld: 3, by: EA, nowUtc: T0,
    legs: [newLeg({ from: { placeName: 'Cincinnati', placeId: null, airport: 'KLUK' }, to: { placeName: 'New York', placeId: null, airport: 'KTEB' }, date: '2026-09-10', timing: { kind: 'depart', departLocal: '09:00', flexHours: 0 } })] });
  t = submitItinerary(t, EA, T0);
  return tail ? assignTail(t, tail, SCHED, T0, { free: true, reason: null }) : t;
}

async function harness() {
  const store = new InMemorySchedulingStore();
  const service = new SchedulingService({ store, idFactory: s => s, officeTzOffsetMinutes: -240 });
  await seedTemplates(store);
  return { store, service };
}

describe('the booking is the only trip: bookings are projected into the scheduling store', () => {
  it('a submitted booking with a tail becomes one record with its checklist instantiated; syncing twice adds nothing', async () => {
    const { store, service } = await harness();
    const t = booking('Teterboro');
    const first = await syncBookingsIntoStore([t], service, store, T0);
    expect(first).toMatchObject({ created: 1, updated: 0, unchanged: 0 });
    expect(await store.listTrips()).toHaveLength(1);
    expect((await store.listInstancesForTrip(t.id)).length).toBeGreaterThan(0);
    const second = await syncBookingsIntoStore([t], service, store, T0);
    expect(second).toMatchObject({ created: 0, updated: 0, unchanged: 1 });
    expect(await store.listTrips()).toHaveLength(1);
  });
  it('a booking that changed (a leg added) is reconciled, not duplicated', async () => {
    const { store, service } = await harness();
    const t = booking('Teterboro');
    await syncBookingsIntoStore([t], service, store, T0);
    const t2 = addLegBy(t, 1, newLeg({ from: { placeName: 'New York', placeId: null, airport: 'KTEB' }, to: { placeName: 'Cincinnati', placeId: null, airport: 'KLUK' }, date: '2026-09-12', timing: { kind: 'depart', departLocal: '16:00', flexHours: 0 } }), SCHED, T0);
    const r = await syncBookingsIntoStore([t2], service, store, T0);
    expect(r).toMatchObject({ created: 0, updated: 1 });
    const rec = (await store.listTrips())[0];
    expect(rec.legs).toHaveLength(2);
    expect(rec.legs[1].id).toBe(t2.legs[1].id);
  });
  it('a booking that stops projecting (cancelled) is marked cancelled in the store rather than left occupying the tail', async () => {
    const { store, service } = await harness();
    const t = booking('Teterboro');
    await syncBookingsIntoStore([t], service, store, T0);
    await syncBookingsIntoStore([cancelTrip(t, EA, 'plans changed', T0)], service, store, T0);
    expect((await store.getTrip(t.id))!.status).toBe('cancelled');
  });
  it('a draft or tail-less booking never reaches the store', async () => {
    const { store, service } = await harness();
    await syncBookingsIntoStore([booking('Unassigned', null)], service, store, T0);
    expect(await store.listTrips()).toHaveLength(0);
  });
  it('records that did not come from a booking (the myairops fixtures) are left alone', async () => {
    const { store, service } = await harness();
    await service.createTripMirror({ id: 'mao-1', tripNumber: 'T-2026-0001', sourceSystem: 'myairops', sourceTripRef: 'MAO-1', tail: 'N6PG', aircraftType: 'G500', tripType: 'domestic', priority: 'standard', status: 'confirmed', startDate: T0, endDate: T0, legs: [], createdBy: 'seed', createdAtUtc: T0 }, T0);
    await syncBookingsIntoStore([booking('Teterboro')], service, store, T0);
    expect(await store.listTrips()).toHaveLength(2);
    expect((await store.getTrip('mao-1'))!.status).toBe('confirmed');
  });
  it('a bumped booking (alive, no tail) cancels its open work but keeps cleared work; a new tail brings the open work back', async () => {
    const { store, service } = await harness();
    const t = booking('Teterboro');
    await syncBookingsIntoStore([t], service, store, T0);
    const before = await store.listInstancesForTrip(t.id);
    expect(before.length).toBeGreaterThan(1);
    const first = before[0];
    if (first.requiresAck) await service.applyAction(first.id, { kind: 'ack' }, 'sched', T0);
    await service.applyAction(first.id, { kind: 'complete' }, 'sched', T0);

    const bumped = bumpTrip(t, SCHED, 'senior-conflict', 'CEO needs it', T0);
    const r1 = await syncBookingsIntoStore([bumped], service, store, T0);
    expect(r1.cancelled).toBe(1);
    const after = await store.listInstancesForTrip(t.id);
    expect(after.find(i => i.id === first.id)!.status).toBe('done');
    expect(after.filter(i => i.id !== first.id).every(i => i.status === 'cancelled')).toBe(true);
    expect((await store.getTrip(t.id))!.status).toBe('cancelled');

    const again = assignTail(bumped, 'N1PG', SCHED, T0, { free: true, reason: null });
    const r2 = await syncBookingsIntoStore([again], service, store, T0);
    expect(r2.updated).toBe(1);
    const revived = await store.listInstancesForTrip(t.id);
    expect((await store.getTrip(t.id))!.status).toBe('confirmed');
    expect((await store.getTrip(t.id))!.tail).toBe('N1PG');
    expect(revived.find(i => i.id === first.id)!.status).toBe('done');
    expect(revived.filter(i => i.id !== first.id).some(i => i.status === 'open')).toBe(true);
    expect(revived.some(i => i.status === 'cancelled')).toBe(false);
  });
  it('cleared work survives a reload: persisted instances are restored before the first sync and the mirror does not overwrite them', async () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); } };
    const a = await harness();
    const t = booking('Teterboro');
    await syncBookingsIntoStore([t], a.service, a.store, T0);
    const first = (await a.store.listInstancesForTrip(t.id))[0];
    if (first.requiresAck) await a.service.applyAction(first.id, { kind: 'ack' }, 'sched', T0);
    await a.service.applyAction(first.id, { kind: 'complete' }, 'sched', T0);
    await persistBookingInstances(a.store, storage);

    const b = await harness();
    expect(await restoreBookingInstances(b.store, storage)).toBeGreaterThan(0);
    const r = await syncBookingsIntoStore([t], b.service, b.store, T0);
    expect(r.created).toBe(1);
    const after = await b.store.listInstancesForTrip(t.id);
    expect(after.find(i => i.id === first.id)!.status).toBe('done');
    expect(after.length).toBe((await a.store.listInstancesForTrip(t.id)).length);
  });
  it('a template republished under a new version between sessions does not duplicate the checklist; cleared work carries onto the new ids', async () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); } };
    const a = await harness();
    const t = booking('Teterboro');
    await syncBookingsIntoStore([t], a.service, a.store, T0);
    const before = await a.store.listInstancesForTrip(t.id);
    const first = before[0];
    if (first.requiresAck) await a.service.applyAction(first.id, { kind: 'ack' }, 'sched', T0);
    await a.service.applyAction(first.id, { kind: 'complete' }, 'sched', T0);
    await persistBookingInstances(a.store, storage);

    const b = await harness();
    const tpl = (await b.store.listPublishedTemplates()).find(x => x.scope === 'domestic')!;
    await b.store.saveTemplate({ ...tpl, version: tpl.version + 1 });
    await restoreBookingInstances(b.store, storage);
    await syncBookingsIntoStore([t], b.service, b.store, T0);
    const after = await b.store.listInstancesForTrip(t.id);
    expect(after.length).toBe(before.length);
    expect(after.every(i => i.templateVersion === tpl.version + 1 || i.templateId !== tpl.id)).toBe(true);
    expect(after.find(i => i.taskDefId === first.taskDefId && i.legId === first.legId)!.status).toBe('done');
  });
});

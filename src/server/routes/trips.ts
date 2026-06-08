// src/server/routes/trips.ts
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { trips, tripLegs, usageLogEntries, tripNotes, tripLoadItems, tripReturnItems } from '../db/schema';
import type { Db } from '../db';

type Env = { Variables: { db: Db } };
const tripsRoute = new Hono<Env>();

// POST /api/trips — create trip
tripsRoute.post('/', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  await db.insert(trips).values({
    id: body.id,
    tailNumber: body.tailNumber,
    aircraftType: body.aircraftType,
    tripName: body.tripName ?? null,
    tripNumber: body.tripNumber ?? null,
    status: body.status,
    startDate: body.startDate,
    endDate: body.endDate ?? null,
    createdBy: body.createdBy,
    createdAt: body.createdAt,
  });

  // Insert legs if provided
  if (body.legs?.length) {
    for (const leg of body.legs) {
      await db.insert(tripLegs).values({
        id: leg.id,
        tripId: body.id,
        legNumber: leg.legNumber,
        origin: leg.origin,
        destination: leg.destination,
        date: leg.date,
        paxCount: leg.paxCount,
        status: leg.status,
        phase: leg.phase,
        groceryListId: leg.groceryListId ?? null,
      });
    }
  }

  return c.json({ ok: true });
});

// PUT /api/trips/:id — update trip header
tripsRoute.put('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  await db.update(trips).set({
    tripName: body.tripName ?? null,
    tripNumber: body.tripNumber ?? null,
    status: body.status,
    startDate: body.startDate,
    endDate: body.endDate ?? null,
  }).where(eq(trips.id, id));
  return c.json({ ok: true });
});

// POST /api/trips/:id/complete — complete trip
tripsRoute.post('/:id/complete', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  await db.update(trips).set({
    status: 'completed',
    endDate: new Date().toISOString(),
  }).where(eq(trips.id, id));
  return c.json({ ok: true });
});

// POST /api/trips/:id/reopen — reopen a completed trip
tripsRoute.post('/:id/reopen', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  await db.update(trips).set({
    status: 'active',
    endDate: null,
  }).where(eq(trips.id, id));
  return c.json({ ok: true });
});

// POST /api/trips/:id/legs — add a leg
tripsRoute.post('/:id/legs', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  await db.insert(tripLegs).values({
    id: body.id,
    tripId: c.req.param('id'),
    legNumber: body.legNumber,
    origin: body.origin,
    destination: body.destination,
    date: body.date,
    paxCount: body.paxCount,
    status: body.status,
    phase: body.phase,
    groceryListId: body.groceryListId ?? null,
  });
  return c.json({ ok: true });
});

// PUT /api/trips/:tripId/legs/:legId — update leg
tripsRoute.put('/:tripId/legs/:legId', async (c) => {
  const db = c.get('db');
  const legId = c.req.param('legId');
  const body = await c.req.json();
  await db.update(tripLegs).set({
    origin: body.origin,
    destination: body.destination,
    date: body.date,
    paxCount: body.paxCount,
    status: body.status,
    phase: body.phase,
    groceryListId: body.groceryListId ?? null,
  }).where(eq(tripLegs.id, legId));
  return c.json({ ok: true });
});

// POST /api/trips/:tripId/legs/:legId/phase — set leg phase
tripsRoute.post('/:tripId/legs/:legId/phase', async (c) => {
  const db = c.get('db');
  const legId = c.req.param('legId');
  const { phase } = await c.req.json<{ phase: string }>();
  await db.update(tripLegs).set({ phase: phase as any }).where(eq(tripLegs.id, legId));
  return c.json({ ok: true });
});

// POST /api/trips/:tripId/legs/:legId/usage — add usage log entry
tripsRoute.post('/:tripId/legs/:legId/usage', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  await db.insert(usageLogEntries).values({
    id: body.id,
    legId: c.req.param('legId'),
    itemId: body.itemId,
    qtyUsed: body.qtyUsed,
    loggedBy: body.loggedBy,
    loggedAt: body.loggedAt,
  });
  return c.json({ ok: true });
});

// PUT /api/trips/:tripId/legs/:legId/usage/:entryId — update usage entry
tripsRoute.put('/:tripId/legs/:legId/usage/:entryId', async (c) => {
  const db = c.get('db');
  const entryId = c.req.param('entryId');
  const body = await c.req.json();
  await db.update(usageLogEntries).set({
    qtyUsed: body.qtyUsed,
  }).where(eq(usageLogEntries.id, entryId));
  return c.json({ ok: true });
});

// DELETE /api/trips/:tripId/legs/:legId/usage/:entryId — remove usage entry
tripsRoute.delete('/:tripId/legs/:legId/usage/:entryId', async (c) => {
  const db = c.get('db');
  const entryId = c.req.param('entryId');
  await db.delete(usageLogEntries).where(eq(usageLogEntries.id, entryId));
  return c.json({ ok: true });
});

// POST /api/trips/:id/notes — add trip note
tripsRoute.post('/:id/notes', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  await db.insert(tripNotes).values({
    id: body.id,
    tripId: c.req.param('id'),
    legId: body.legId ?? null,
    text: body.text,
    author: body.author,
    createdAt: body.createdAt,
  });
  return c.json({ ok: true });
});

// POST /api/trips/:id/load-items — add load items
tripsRoute.post('/:id/load-items', async (c) => {
  const db = c.get('db');
  const { items } = await c.req.json<{ items: any[] }>();
  for (const li of items) {
    await db.insert(tripLoadItems).values({
      id: li.id,
      tripId: c.req.param('id'),
      itemId: li.itemId,
      qty: li.qty,
      source: li.source,
      loadedBy: li.loadedBy,
      loadedAt: li.loadedAt,
      legId: li.legId ?? null,
    });
  }
  return c.json({ ok: true });
});

// POST /api/trips/:id/return-items — add return items
tripsRoute.post('/:id/return-items', async (c) => {
  const db = c.get('db');
  const { items } = await c.req.json<{ items: any[] }>();
  for (const ri of items) {
    await db.insert(tripReturnItems).values({
      id: ri.id,
      tripId: c.req.param('id'),
      itemId: ri.itemId,
      qty: ri.qty,
      returnedBy: ri.returnedBy,
      returnedAt: ri.returnedAt,
    });
  }
  return c.json({ ok: true });
});

export { tripsRoute };

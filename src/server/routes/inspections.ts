// src/server/routes/inspections.ts
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { inspections } from '../db/schema';
import type { Db } from '../db';

type Env = { Variables: { db: Db } };
const inspectionsRoute = new Hono<Env>();

inspectionsRoute.post('/', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  await db.insert(inspections).values({
    id: body.id,
    tailNumber: body.tailNumber,
    aircraftType: body.aircraftType,
    date: body.date,
    reportedBy: body.reportedBy,
    reservationId: body.reservationId ?? null,
    status: body.status,
    checkedItems: body.checkedItems ?? [],
    topLevelNotes: body.topLevelNotes ?? '',
    photos: body.photos ?? [],
    additionalFees: body.additionalFees ?? [],
    missingItemCharges: body.missingItemCharges ?? [],
    readinessScore: body.readinessScore ?? 0,
    submittedAt: body.submittedAt ?? null,
  });
  return c.json({ ok: true });
});

inspectionsRoute.put('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  await db.update(inspections).set({
    status: body.status,
    checkedItems: body.checkedItems,
    topLevelNotes: body.topLevelNotes,
    photos: body.photos,
    additionalFees: body.additionalFees,
    missingItemCharges: body.missingItemCharges,
    readinessScore: body.readinessScore,
    submittedAt: body.submittedAt ?? null,
  }).where(eq(inspections.id, id));
  return c.json({ ok: true });
});

export { inspectionsRoute };

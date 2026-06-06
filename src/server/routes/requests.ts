// src/server/routes/requests.ts
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { unitItemRequests } from '../db/schema';
import type { Db } from '../db';

type Env = { Variables: { db: Db } };
const requestsRoute = new Hono<Env>();

requestsRoute.post('/', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  await db.insert(unitItemRequests).values({
    id: body.id,
    unitTailNumber: body.unitTailNumber,
    isGuestRequest: body.isGuestRequest,
    notes: body.notes ?? '',
    status: body.status,
    requestedBy: body.requestedBy,
    requestDate: body.requestDate,
    items: body.items ?? [],
  });
  return c.json({ ok: true });
});

requestsRoute.put('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  await db.update(unitItemRequests).set({
    status: body.status,
    notes: body.notes,
    items: body.items,
  }).where(eq(unitItemRequests.id, id));
  return c.json({ ok: true });
});

export { requestsRoute };

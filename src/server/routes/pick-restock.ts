// src/server/routes/pick-restock.ts
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { pickListItems, restockListItems } from '../db/schema';
import type { Db } from '../db';

type Env = { Variables: { db: Db } };
const pickRestockRoute = new Hono<Env>();

// Pick list
pickRestockRoute.post('/pick', async (c) => {
  const db = c.get('db');
  const { items } = await c.req.json<{ items: any[] }>();
  for (const item of items) {
    await db.insert(pickListItems).values({
      id: item.id,
      inspectionId: item.inspectionId,
      unitTailNumber: item.unitTailNumber,
      itemId: item.itemId,
      qtyNeeded: item.qtyNeeded,
      qtyTaken: item.qtyTaken ?? 0,
      done: item.done ?? false,
    });
  }
  return c.json({ ok: true });
});

pickRestockRoute.put('/pick/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  await db.update(pickListItems).set({
    qtyTaken: body.qtyTaken,
    done: body.done,
  }).where(eq(pickListItems.id, id));
  return c.json({ ok: true });
});

// Restock list
pickRestockRoute.post('/restock', async (c) => {
  const db = c.get('db');
  const { items } = await c.req.json<{ items: any[] }>();
  for (const item of items) {
    await db.insert(restockListItems).values({
      id: item.id,
      inspectionId: item.inspectionId,
      unitTailNumber: item.unitTailNumber,
      itemId: item.itemId,
      qtyPicked: item.qtyPicked ?? 0,
      qtyNeeded: item.qtyNeeded,
      done: item.done ?? false,
      cancelled: item.cancelled ?? false,
    });
  }
  return c.json({ ok: true });
});

pickRestockRoute.put('/restock/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  await db.update(restockListItems).set({
    qtyPicked: body.qtyPicked,
    done: body.done,
    cancelled: body.cancelled,
  }).where(eq(restockListItems.id, id));
  return c.json({ ok: true });
});

// SET (replace entire list) — used by SET_RESTOCK_LIST action
pickRestockRoute.put('/restock-all', async (c) => {
  const db = c.get('db');
  const { items } = await c.req.json<{ items: any[] }>();
  // Delete all existing, insert new
  // For 4 users this is fine — no transaction needed
  for (const item of items) {
    await db.insert(restockListItems).values({
      id: item.id,
      inspectionId: item.inspectionId,
      unitTailNumber: item.unitTailNumber,
      itemId: item.itemId,
      qtyPicked: item.qtyPicked ?? 0,
      qtyNeeded: item.qtyNeeded,
      done: item.done ?? false,
      cancelled: item.cancelled ?? false,
    }).onConflictDoUpdate({
      target: restockListItems.id,
      set: {
        qtyPicked: item.qtyPicked ?? 0,
        done: item.done ?? false,
        cancelled: item.cancelled ?? false,
      },
    });
  }
  return c.json({ ok: true });
});

export { pickRestockRoute };

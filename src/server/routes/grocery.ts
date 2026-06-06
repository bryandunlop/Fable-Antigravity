// src/server/routes/grocery.ts
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { groceryLists, groceryListItems } from '../db/schema';
import type { Db } from '../db';

type Env = { Variables: { db: Db } };
const groceryRoute = new Hono<Env>();

// POST /api/grocery — create grocery list
groceryRoute.post('/', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  await db.insert(groceryLists).values({
    id: body.id,
    tripId: body.tripId,
    legId: body.legId ?? null,
    tailNumber: body.tailNumber,
    status: body.status,
    generatedAt: body.generatedAt,
    generatedBy: body.generatedBy,
    notes: body.notes ?? null,
  });

  if (body.items?.length) {
    for (const item of body.items) {
      await db.insert(groceryListItems).values({
        id: item.id,
        groceryListId: body.id,
        itemId: item.itemId,
        qtyNeeded: item.qtyNeeded,
        qtyFulfilled: item.qtyFulfilled ?? 0,
        isManual: item.isManual ?? false,
        manualItemName: item.manualItemName ?? null,
      });
    }
  }

  return c.json({ ok: true });
});

// PUT /api/grocery/:id — update grocery list (replaces items)
groceryRoute.put('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();

  await db.update(groceryLists).set({
    status: body.status,
    notes: body.notes ?? null,
  }).where(eq(groceryLists.id, id));

  // Replace items — delete existing, insert new
  if (body.items) {
    await db.delete(groceryListItems).where(eq(groceryListItems.groceryListId, id));
    for (const item of body.items) {
      await db.insert(groceryListItems).values({
        id: item.id,
        groceryListId: id,
        itemId: item.itemId,
        qtyNeeded: item.qtyNeeded,
        qtyFulfilled: item.qtyFulfilled ?? 0,
        isManual: item.isManual ?? false,
        manualItemName: item.manualItemName ?? null,
      });
    }
  }

  return c.json({ ok: true });
});

// POST /api/grocery/:id/send — mark as sent
groceryRoute.post('/:id/send', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  await db.update(groceryLists).set({ status: 'sent' }).where(eq(groceryLists.id, id));
  return c.json({ ok: true });
});

// POST /api/grocery/:id/fulfill — mark as fulfilled
groceryRoute.post('/:id/fulfill', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  await db.update(groceryLists).set({ status: 'fulfilled' }).where(eq(groceryLists.id, id));
  return c.json({ ok: true });
});

export { groceryRoute };

// src/server/routes/stockroom.ts
import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { stockroomItems } from '../db/schema';
import type { Db } from '../db';

type Env = { Variables: { db: Db } };
const stockroomRoute = new Hono<Env>();

// PUT /api/stockroom/item — upsert single stockroom item.
// Insert path matters: newly created items dispatch UPDATE_STOCKROOM_ITEM for a row that doesn't exist yet.
stockroomRoute.put('/item', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  const values = {
    qtyOnHand: body.qtyOnHand,
    parLevel: body.parLevel,
    minimumLevel: body.minimumLevel,
    binLocation: body.binLocation ?? '',
    locationId: body.locationId ?? null,
  };
  await db.insert(stockroomItems).values({
    itemId: body.itemId,
    stockroomId: body.stockroomId,
    ...values,
  }).onConflictDoUpdate({
    target: [stockroomItems.itemId, stockroomItems.stockroomId],
    set: values,
  });
  return c.json({ ok: true });
});

// PUT /api/stockroom/bulk — bulk update stockroom items
stockroomRoute.put('/bulk', async (c) => {
  const db = c.get('db');
  const { items: updatedItems } = await c.req.json<{ items: Array<{
    itemId: string; stockroomId: string; qtyOnHand: number;
    parLevel: number; minimumLevel: number; binLocation: string;
    locationId?: string;
  }> }>();

  // Update each item — Neon HTTP driver doesn't support transactions,
  // but for 4 users this is fine. Each update is independent.
  for (const item of updatedItems) {
    await db.update(stockroomItems).set({
      qtyOnHand: item.qtyOnHand,
      parLevel: item.parLevel,
      minimumLevel: item.minimumLevel,
      binLocation: item.binLocation,
      locationId: item.locationId ?? null,
    }).where(
      and(
        eq(stockroomItems.itemId, item.itemId),
        eq(stockroomItems.stockroomId, item.stockroomId),
      )
    );
  }

  return c.json({ ok: true });
});

export { stockroomRoute };

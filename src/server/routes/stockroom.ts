// src/server/routes/stockroom.ts
import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { stockroomItems } from '../db/schema';
import type { Db } from '../db';

type Env = { Variables: { db: Db } };
const stockroomRoute = new Hono<Env>();

// PUT /api/stockroom/item — update single stockroom item
stockroomRoute.put('/item', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  await db.update(stockroomItems).set({
    qtyOnHand: body.qtyOnHand,
    parLevel: body.parLevel,
    minimumLevel: body.minimumLevel,
    binLocation: body.binLocation,
  }).where(
    and(
      eq(stockroomItems.itemId, body.itemId),
      eq(stockroomItems.stockroomId, body.stockroomId),
    )
  );
  return c.json({ ok: true });
});

// PUT /api/stockroom/bulk — bulk update stockroom items
stockroomRoute.put('/bulk', async (c) => {
  const db = c.get('db');
  const { items: updatedItems } = await c.req.json<{ items: Array<{
    itemId: string; stockroomId: string; qtyOnHand: number;
    parLevel: number; minimumLevel: number; binLocation: string;
  }> }>();

  // Update each item — Neon HTTP driver doesn't support transactions,
  // but for 4 users this is fine. Each update is independent.
  for (const item of updatedItems) {
    await db.update(stockroomItems).set({
      qtyOnHand: item.qtyOnHand,
      parLevel: item.parLevel,
      minimumLevel: item.minimumLevel,
      binLocation: item.binLocation,
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

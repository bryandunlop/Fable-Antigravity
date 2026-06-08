// src/server/routes/stock.ts
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { stockBatches, alertThresholds, stockLogEntries } from '../db/schema';
import type { Db } from '../db';

type Env = { Variables: { db: Db } };
const stockRoute = new Hono<Env>();

// ── Stock batches ──
stockRoute.post('/batches', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  await db.insert(stockBatches).values({
    id: body.id,
    itemId: body.itemId,
    stockroomId: body.stockroomId,
    quantity: body.quantity,
    expirationDate: body.expirationDate ?? null,
    receivedDate: body.receivedDate,
    batchLabel: body.batchLabel ?? null,
  });
  return c.json({ ok: true });
});

stockRoute.put('/batches/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  await db.update(stockBatches).set({
    quantity: body.quantity,
    expirationDate: body.expirationDate ?? null,
    batchLabel: body.batchLabel ?? null,
  }).where(eq(stockBatches.id, id));
  return c.json({ ok: true });
});

stockRoute.delete('/batches/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  await db.delete(stockBatches).where(eq(stockBatches.id, id));
  return c.json({ ok: true });
});

// ── Alert thresholds ──
stockRoute.post('/alert-thresholds', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  await db.insert(alertThresholds).values({
    id: body.id,
    userId: body.userId,
    itemId: body.itemId,
    threshold: body.threshold,
    enabled: body.enabled,
  }).onConflictDoUpdate({
    target: alertThresholds.id,
    set: { threshold: body.threshold, enabled: body.enabled },
  });
  return c.json({ ok: true });
});

stockRoute.delete('/alert-thresholds/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  await db.delete(alertThresholds).where(eq(alertThresholds.id, id));
  return c.json({ ok: true });
});

// ── Stock log ──
stockRoute.post('/log', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  await db.insert(stockLogEntries).values({
    id: body.id,
    stockroomId: body.stockroomId,
    addedBy: body.addedBy,
    timestamp: body.timestamp,
    items: body.items,
    notes: body.notes ?? null,
  });
  return c.json({ ok: true });
});

export { stockRoute };

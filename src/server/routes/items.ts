// src/server/routes/items.ts
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { items, stockroomItems, stockBatches } from '../db/schema';
import type { Db } from '../db';

type Env = { Variables: { db: Db } };
const itemsRoute = new Hono<Env>();

// POST /api/items — create
itemsRoute.post('/', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  await db.insert(items).values({
    id: body.id,
    itemName: body.itemName,
    description: body.description ?? null,
    category: body.category,
    supplyCategory: body.supplyCategory,
    compartmentId: body.compartmentId,
    location: body.location,
    uom: body.uom,
    vendorItemNumber: body.vendorItemNumber ?? null,
    internalItemNumber: body.internalItemNumber ?? null,
    thumbnailUrl: body.thumbnailUrl ?? null,
    costPerUnit: body.costPerUnit ?? null,
    defaultQuantities: body.defaultQuantities ?? {},
    alternateNames: body.alternateNames ?? [],
    reorderUrl: body.reorderUrl ?? null,
    barcode: body.barcode ?? null,
    isConsumable: body.isConsumable ?? null,
    posCategory: body.posCategory ?? null,
    vendor: body.vendor ?? null,
  });
  return c.json({ ok: true });
});

// PUT /api/items/:id — update
itemsRoute.put('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  await db.update(items).set({
    itemName: body.itemName,
    description: body.description ?? null,
    category: body.category,
    supplyCategory: body.supplyCategory,
    compartmentId: body.compartmentId,
    location: body.location,
    uom: body.uom,
    vendorItemNumber: body.vendorItemNumber ?? null,
    internalItemNumber: body.internalItemNumber ?? null,
    thumbnailUrl: body.thumbnailUrl ?? null,
    costPerUnit: body.costPerUnit ?? null,
    defaultQuantities: body.defaultQuantities ?? {},
    alternateNames: body.alternateNames ?? [],
    reorderUrl: body.reorderUrl ?? null,
    barcode: body.barcode ?? null,
    isConsumable: body.isConsumable ?? null,
    posCategory: body.posCategory ?? null,
    vendor: body.vendor ?? null,
  }).where(eq(items.id, id));
  return c.json({ ok: true });
});

// DELETE /api/items/:id — delete
itemsRoute.delete('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  // stockroom_items.item_id references items.id with no cascade — clear dependents first.
  await db.delete(stockroomItems).where(eq(stockroomItems.itemId, id));
  await db.delete(stockBatches).where(eq(stockBatches.itemId, id));
  await db.delete(items).where(eq(items.id, id));
  return c.json({ ok: true });
});

export { itemsRoute };

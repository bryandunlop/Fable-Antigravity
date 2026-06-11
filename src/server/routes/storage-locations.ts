// src/server/routes/storage-locations.ts
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { storageLocations } from '../db/schema';
import type { Db } from '../db';

type Env = { Variables: { db: Db } };
const storageLocationsRoute = new Hono<Env>();

// POST /api/storage-locations — create
storageLocationsRoute.post('/', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  await db.insert(storageLocations).values({
    id: body.id,
    name: body.name,
    type: body.type,
    sortOrder: body.sortOrder ?? 0,
    thumbnailUrl: body.thumbnailUrl ?? null,
  });
  return c.json({ ok: true });
});

// PUT /api/storage-locations/reorder — reorder by id list
storageLocationsRoute.put('/reorder', async (c) => {
  const db = c.get('db');
  const { ids } = await c.req.json<{ ids: string[] }>();
  // Update sortOrder for each id by its position in the array
  for (let i = 0; i < ids.length; i++) {
    await db.update(storageLocations)
      .set({ sortOrder: i })
      .where(eq(storageLocations.id, ids[i]));
  }
  return c.json({ ok: true });
});

// PUT /api/storage-locations/:id — partial update
storageLocationsRoute.put('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  const body = await c.req.json();
  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.type !== undefined) update.type = body.type;
  if (body.sortOrder !== undefined) update.sortOrder = body.sortOrder;
  if (body.thumbnailUrl !== undefined) update.thumbnailUrl = body.thumbnailUrl;
  if (Object.keys(update).length > 0) {
    await db.update(storageLocations).set(update).where(eq(storageLocations.id, id));
  }
  return c.json({ ok: true });
});

// DELETE /api/storage-locations/:id
storageLocationsRoute.delete('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');
  await db.delete(storageLocations).where(eq(storageLocations.id, id));
  return c.json({ ok: true });
});

export { storageLocationsRoute };

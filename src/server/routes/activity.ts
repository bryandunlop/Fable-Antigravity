// src/server/routes/activity.ts
import { Hono } from 'hono';
import { activityLog } from '../db/schema';
import type { Db } from '../db';

type Env = { Variables: { db: Db } };
const activityRoute = new Hono<Env>();

activityRoute.post('/', async (c) => {
  const db = c.get('db');
  const body = await c.req.json();
  await db.insert(activityLog).values({
    id: body.id,
    timestamp: body.timestamp,
    userId: body.userId,
    userName: body.userName,
    action: body.action,
    module: body.module,
    description: body.description,
    metadata: body.metadata ?? null,
  });
  return c.json({ ok: true });
});

export { activityRoute };

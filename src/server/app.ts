// Hono API app for inventory-v2.
// Mounted at /api via Vercel serverless function in api/[[...route]].ts.
// Domain routes are added in subsequent commits (state, items, trips, etc).
// No auth — 4-person test group accessed via shared link, user picked via existing UserSwitcher.

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createDb, type Db } from './db';
import { state } from './routes/state';

type Env = { Variables: { db: Db } };

const app = new Hono<Env>().basePath('/api');

// CORS — allow local dev (Vite on :5173) and same-origin in prod
app.use('*', cors({
  origin: (origin) => origin || '*',
  credentials: true,
}));

// Inject DB into context for all routes
app.use('*', async (c, next) => {
  c.set('db', createDb());
  await next();
});

// Health check
app.get('/health', (c) => c.json({ ok: true }));

app.route('/state', state);

export { app };
export type { Env };

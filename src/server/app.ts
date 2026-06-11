// Hono API app for inventory-v2.
// Mounted at /api via Vercel serverless function in api/[[...route]].ts.
// Domain routes are added in subsequent commits (state, items, trips, etc).
// No auth — 4-person test group accessed via shared link, user picked via existing UserSwitcher.

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createDb, type Db } from './db';
import { state } from './routes/state';
import { itemsRoute } from './routes/items';
import { stockroomRoute } from './routes/stockroom';
import { inspectionsRoute } from './routes/inspections';
import { tripsRoute } from './routes/trips';
import { groceryRoute } from './routes/grocery';
import { stockRoute } from './routes/stock';
import { pickRestockRoute } from './routes/pick-restock';
import { requestsRoute } from './routes/requests';
import { activityRoute } from './routes/activity';
import { storageLocationsRoute } from './routes/storage-locations';
import { weatherRoute } from './routes/weather';
import { uploadRoute } from './routes/upload';

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
app.route('/items', itemsRoute);
app.route('/stockroom', stockroomRoute);
app.route('/inspections', inspectionsRoute);
app.route('/trips', tripsRoute);
app.route('/grocery', groceryRoute);
app.route('/stock', stockRoute);
app.route('/pick-restock', pickRestockRoute);
app.route('/requests', requestsRoute);
app.route('/activity', activityRoute);
app.route('/storage-locations', storageLocationsRoute);
app.route('/upload', uploadRoute);
app.route('/weather', weatherRoute);

export { app };
export type { Env };

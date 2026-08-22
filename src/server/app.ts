// Hono API app for inventory-v2.
// Mounted at /api via Vercel serverless function in api/[...route].ts.
// Domain routes are added in subsequent commits (state, items, trips, etc).
// No auth — 4-person test group accessed via shared link, user picked via existing UserSwitcher.

import { Hono, type MiddlewareHandler } from 'hono';
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
import { worklogRoute } from './routes/worklog';
import { weatherRoute, forecastRoute } from './routes/weather';

type Env = { Variables: { db: Db } };

const app = new Hono<Env>().basePath('/api');

// CORS — allow local dev (Vite on :5173) and same-origin in prod
app.use('*', cors({
  origin: (origin) => origin || '*',
  credentials: true,
}));

// Health check. Deliberately registered BEFORE any DB middleware: a health
// check that cannot answer without a database is not a health check.
app.get('/health', (c) => c.json({ ok: true }));

// Routes that read the database. createDb() is attached to these mount points
// ONLY — it used to run on app.use('*'), which meant it threw for every request
// when DATABASE_URL was absent, 500ing routes that touch no database at all.
// That is not hypothetical: it took out /api/health and the whole weather card
// in production (TL-18 fault 1b, TL-15 cause 2).
//
// The mount table IS the list — a new DB route is added here and gets a db; a
// route added outside this loop gets none and therefore cannot be broken by an
// unconfigured database.
const dbRoutes = {
  '/state': state,
  '/items': itemsRoute,
  '/stockroom': stockroomRoute,
  '/inspections': inspectionsRoute,
  '/trips': tripsRoute,
  '/grocery': groceryRoute,
  '/stock': stockRoute,
  '/pick-restock': pickRestockRoute,
  '/requests': requestsRoute,
  '/activity': activityRoute,
  '/storage-locations': storageLocationsRoute,
  // Personal effort log — shares the database, touches no product table.
  '/worklog': worklogRoute,
} as const;

const withDb: MiddlewareHandler<Env> = async (c, next) => {
  c.set('db', createDb());
  await next();
};

for (const [path, route] of Object.entries(dbRoutes)) {
  // Both forms: '/state' matches the bare collection path, '/state/*' its
  // children. Hono treats them as distinct patterns.
  app.use(path, withDb);
  app.use(`${path}/*`, withDb);
  app.route(path, route);
}

// DB-free routes. These proxy upstream weather APIs and never touch Postgres,
// so they must keep working with DATABASE_URL unset.
app.route('/weather', weatherRoute);
app.route('/forecast', forecastRoute);

export { app };
export type { Env };

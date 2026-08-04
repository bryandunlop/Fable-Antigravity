// Vercel serverless entry — Hono app at /api/*.
// Edge runtime: hono/vercel's handle() returns a fetch handler that expects
// a Web Request. @neondatabase/serverless is built for edge environments.
import { handle } from 'hono/vercel';
import { app } from '../src/server/app';

export const config = { runtime: 'edge' };

export default handle(app);

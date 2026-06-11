// src/server/routes/upload.ts
import { Hono } from 'hono';
import { put } from '@vercel/blob';
import type { Db } from '../db';

type Env = { Variables: { db: Db } };
const uploadRoute = new Hono<Env>();

// POST /api/upload?filename=photo.jpg — body is the raw image bytes.
// Returns { url } of the stored blob. Requires BLOB_READ_WRITE_TOKEN env var on Vercel.
uploadRoute.post('/', async (c) => {
  const filename = c.req.query('filename') || 'photo.jpg';
  const contentType = c.req.header('content-type') || '';
  if (!contentType.startsWith('image/')) {
    return c.json({ error: 'Only image uploads are allowed' }, 400);
  }
  const bytes = await c.req.arrayBuffer();
  if (bytes.byteLength === 0) return c.json({ error: 'Empty body' }, 400);
  if (bytes.byteLength > 8 * 1024 * 1024) return c.json({ error: 'Image too large (8 MB max)' }, 413);
  const blob = await put(`inventory/${filename}`, bytes, {
    access: 'public',
    addRandomSuffix: true,
    contentType,
  });
  return c.json({ url: blob.url });
});

export { uploadRoute };

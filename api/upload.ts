// Standalone Node.js serverless function for image uploads via Vercel Blob.
// Kept separate from the main Edge-runtime Hono app because @vercel/blob
// uses undici (Node.js built-ins) which are unsupported on Edge runtime.
import { put } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = { runtime: 'nodejs' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawFilename = (req.query.filename as string) || 'photo.jpg';
  const filename = rawFilename.replace(/[/\\]/g, '_');
  const contentType = req.headers['content-type'] || '';

  if (!contentType.startsWith('image/')) {
    return res.status(400).json({ error: 'Only image uploads are allowed' });
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const bytes = Buffer.concat(chunks);

  if (bytes.byteLength === 0) return res.status(400).json({ error: 'Empty body' });
  if (bytes.byteLength > 8 * 1024 * 1024) return res.status(413).json({ error: 'Image too large (8 MB max)' });

  try {
    const blob = await put(`inventory/${filename}`, bytes, {
      access: 'public',
      addRandomSuffix: true,
      contentType,
    });
    return res.status(200).json({ url: blob.url });
  } catch (err) {
    console.error('[upload] blob put failed:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Upload failed' });
  }
}

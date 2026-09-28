// Lists gallery entries, newest first.
import { list } from '@vercel/blob';

export default async function handler(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 60, 200);
    const { blobs } = await list({ prefix: 'gallery/entries/', limit: 1000 });
    const newest = blobs
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
      .slice(0, limit);
    const entries = (await Promise.all(newest.map(async (b) => {
      try { const r = await fetch(b.url); return r.ok ? await r.json() : null; } catch { return null; }
    }))).filter(Boolean);
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
    return res.status(200).json({ entries });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ entries: [], error: "Couldn't load the gallery." });
  }
}

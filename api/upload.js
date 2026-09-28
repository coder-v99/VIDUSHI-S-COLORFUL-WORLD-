// Saves one gallery entry: the drawing photo plus a small JSON card (name + note).
import { put } from '@vercel/blob';

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB after the browser shrinks the photo
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const clean = (v, max) =>
  String(v ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(body.image || '');
    if (!m) return res.status(400).json({ error: 'Please choose a photo of your drawing.' });
    const bytes = Buffer.from(m[2], 'base64');
    if (bytes.length > MAX_BYTES) return res.status(413).json({ error: 'That photo is too big. Try a smaller one.' });

    const name = clean(body.name, 30);
    const note = clean(body.note, 200);
    const drawing = clean(body.drawing, 30) || 'mushroom';
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const img = await put(`gallery/images/${id}.${TYPES[m[1]]}`, bytes, {
      access: 'public', contentType: m[1], addRandomSuffix: false,
    });
    const entry = { id, image: img.url, name, note, drawing, createdAt: new Date().toISOString() };
    await put(`gallery/entries/${id}.json`, JSON.stringify(entry), {
      access: 'public', contentType: 'application/json', addRandomSuffix: false,
    });
    return res.status(200).json({ ok: true, entry });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Couldn't save your drawing. Please try again." });
  }
}

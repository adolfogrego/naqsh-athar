import { put, list } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: { sizeLimit: '500kb' },
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { photo } = req.body;

    if (typeof photo !== 'string' || !photo.startsWith('data:image/')) {
      return res.status(400).json({ error: 'photo must be a data URL' });
    }

    // Check if already saved — no need to overwrite
    const { blobs } = await list({ prefix: 'orante.json' });
    if (blobs.find(b => b.pathname === 'orante.json')) {
      return res.status(200).json({ ok: true, cached: true });
    }

    const payload = JSON.stringify({ photo });
    await put('orante.json', payload, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    console.log('orante.json saved OK');
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('guardar-orante error:', err);
    return res.status(500).json({ error: err.message });
  }
}

import { list } from '@vercel/blob';

export default async function handler(req, res) {
  const { id } = req.query;
  console.log(`[id] called with id: ${id}`);

  if (!id || !/^\d{12}(\d{3})?$/.test(id)) {
    console.log(`[id] invalid id format: ${id}`);
    return res.redirect(302, 'https://naqsh-athar.link');
  }

  // Also accept direct fetch from index.html (no redirect for JSON requests)
  const wantsJson = req.headers['accept']?.includes('application/json')
    || req.headers['x-requested-with'] === 'XMLHttpRequest';

  try {
    console.log(`[id] listing blobs with prefix: ${id}.json`);
    const { blobs } = await list({ prefix: `${id}.json` });
    console.log(`[id] found ${blobs.length} blobs`);

    const blob = blobs.find(b => b.pathname === `${id}.json`);

    if (!blob) {
      console.log(`[id] blob not found: ${id}.json`);
      if (wantsJson) return res.status(404).json({ error: 'not found' });
      return res.redirect(302, 'https://naqsh-athar.link');
    }

    console.log(`[id] fetching blob url: ${blob.url}`);
    const response = await fetch(blob.url);
    if (!response.ok) {
      console.log(`[id] blob fetch failed: ${response.status}`);
      if (wantsJson) return res.status(502).json({ error: 'fetch failed' });
      return res.redirect(302, 'https://naqsh-athar.link');
    }

    const data = await response.json();

    if (!data.photo || !data.origin || !data.portalUrl) {
      console.log(`[id] invalid structure:`, Object.keys(data));
      if (wantsJson) return res.status(422).json({ error: 'invalid structure' });
      return res.redirect(302, 'https://naqsh-athar.link');
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    console.log(`[id] success: ${id}`);
    return res.status(200).json(data);

  } catch (err) {
    console.error('[id] error:', err.message, err.stack);
    if (wantsJson) return res.status(500).json({ error: err.message });
    return res.redirect(302, 'https://naqsh-athar.link');
  }
}

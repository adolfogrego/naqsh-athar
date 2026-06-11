import { list } from '@vercel/blob';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id || !/^\d{12}(\d{3})?$/.test(id)) {
    return res.redirect(302, 'https://naqsh-athar.link');
  }

  try {
    // Use SDK list() to find the blob — avoids manual URL construction
    const { blobs } = await list({ prefix: `${id}.json` });
    const blob = blobs.find(b => b.pathname === `${id}.json`);

    if (!blob) {
      console.log(`[id] not found in blob: ${id}.json`);
      return res.redirect(302, 'https://naqsh-athar.link');
    }

    const response = await fetch(blob.url);
    if (!response.ok) {
      console.log(`[id] fetch failed for ${blob.url}: ${response.status}`);
      return res.redirect(302, 'https://naqsh-athar.link');
    }

    const data = await response.json();

    if (!data.photo || !data.origin || !data.portalUrl) {
      console.log(`[id] invalid structure for ${id}`);
      return res.redirect(302, 'https://naqsh-athar.link');
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).json(data);

  } catch (err) {
    console.error('[id] error:', err);
    return res.redirect(302, 'https://naqsh-athar.link');
  }
}

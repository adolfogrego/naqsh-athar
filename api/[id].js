export default async function handler(req, res) {
  const { id } = req.query;

  if (!id || !/^\d{12}(\d{3})?$/.test(id)) {
    return res.redirect(302, 'https://naqsh-athar.link');
  }

  try {
    const storeId = process.env.BLOB_STORE_ID || '';
    const storePrefix = storeId.replace('store_', '').toLowerCase();
    const blobUrl = `https://${storePrefix}.public.blob.vercel-storage.com/${id}.json`;

    const response = await fetch(blobUrl);

    if (!response.ok) {
      return res.redirect(302, 'https://naqsh-athar.link');
    }

    const data = await response.json();

    // Validate structure before serving
    if (!data.photo || !data.origin || !data.portalUrl) {
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

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id || !/^\d{12}(\d{3})?$/.test(id)) {
    return res.redirect(302, 'https://naqsh-athar.link');
  }

  try {
    const storeId = process.env.BLOB_STORE_ID || '';
    const storePrefix = storeId.replace('store_', '').toLowerCase();
    const blobUrl = `https://${storePrefix}.public.blob.vercel-storage.com/${id}.html`;

    const response = await fetch(blobUrl);

    if (!response.ok) {
      return res.redirect(302, 'https://naqsh-athar.link');
    }

    const html = await response.text();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(html);

  } catch (err) {
    console.error('[id] error:', err);
    return res.redirect(302, 'https://naqsh-athar.link');
  }
}

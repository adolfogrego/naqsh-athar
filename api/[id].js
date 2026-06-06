import { get } from '@vercel/blob';

export default async function handler(req, res) {
  const { id } = req.query;

  // Validate: only digits, 12 or 15 chars
  if (!id || !/^\d{12}(\d{3})?$/.test(id)) {
    return res.status(400).send('ID inválido');
  }

  try {
    const filename = `${id}.html`;
    const blob = await get(filename);

    if (!blob) {
      return res.status(404).send('Naqsh-Athar no encontrado');
    }

    const response = await fetch(blob.url);
    const html = await response.text();

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(html);

  } catch (err) {
    console.error('[id] error:', err);
    return res.status(404).send('Naqsh-Athar no encontrado');
  }
}

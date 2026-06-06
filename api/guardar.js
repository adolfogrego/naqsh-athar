import { put, head } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
};

function generateId() {
  const now = new Date();
  const dd   = String(now.getDate()).padStart(2,'0');
  const mm   = String(now.getMonth()+1).padStart(2,'0');
  const yy   = String(now.getFullYear()).slice(-2);
  const hh   = String(now.getHours()).padStart(2,'0');
  const min  = String(now.getMinutes()).padStart(2,'0');
  const ss   = String(now.getSeconds()).padStart(2,'0');
  return `${dd}${mm}${yy}${hh}${min}${ss}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { html } = req.body;
    if (!html || typeof html !== 'string') {
      return res.status(400).json({ error: 'Missing html content' });
    }

    let id = generateId();
    let filename = `${id}.html`;

    // Check for collision — add milliseconds if needed
    try {
      await head(filename);
      // File exists — add milliseconds
      const ms = String(new Date().getMilliseconds()).padStart(3,'0');
      id = id + ms;
      filename = `${id}.html`;
    } catch {
      // File doesn't exist — no collision, proceed
    }

    const blob = await put(filename, html, {
      access: 'public',
      contentType: 'text/html; charset=utf-8',
    });

    const url = `https://naqsh-athar.link/${id}`;
    return res.status(200).json({ url, id });

  } catch (err) {
    console.error('guardar error:', err);
    return res.status(500).json({ error: 'Error al guardar' });
  }
}

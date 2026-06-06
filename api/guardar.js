import { put, head } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

function generateId() {
  const now = new Date();
  const dd  = String(now.getDate()).padStart(2,'0');
  const mm  = String(now.getMonth()+1).padStart(2,'0');
  const yy  = String(now.getFullYear()).slice(-2);
  const hh  = String(now.getHours()).padStart(2,'0');
  const min = String(now.getMinutes()).padStart(2,'0');
  const ss  = String(now.getSeconds()).padStart(2,'0');
  return `${dd}${mm}${yy}${hh}${min}${ss}`;
}

function validateHtml(html) {
  // 1. Must be a string
  if (typeof html !== 'string') return false;

  // 2. Size check — max 1MB
  const sizeKB = Buffer.byteLength(html, 'utf8') / 1024;
  if (sizeKB > 1024) return false;

  // 3. Must be valid HTML document
  if (!html.includes('<!DOCTYPE html>')) return false;
  if (!html.includes('</html>')) return false;

  // 4. Must contain Naqsh-Athar structural markers
  const required = [
    'naqsh-athar',           // project identifier
    'arabic-title',          // arabic title element
    'portada-circle',        // circle image
    'activar-slide',         // activation slide
    'dl-btn-html',           // download buttons
    'NAQSH_ORIGIN',          // traceability comment
    'نقش أثر',               // arabic text
  ];

  for (const marker of required) {
    if (!html.includes(marker)) return false;
  }

  // 5. Must NOT contain suspicious patterns
  const forbidden = [
    '<script src="http',     // external scripts not from our CDN
    'eval(',                 // eval calls
    'document.cookie',       // cookie theft
    'localStorage',          // storage abuse
    'fetch("http',           // arbitrary external fetches (allow relative)
  ];

  for (const pattern of forbidden) {
    if (html.includes(pattern)) return false;
  }

  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { html } = req.body;

    if (!validateHtml(html)) {
      return res.status(400).json({ error: 'Contenido inválido' });
    }

    let id = generateId();
    let filename = `${id}.html`;

    // Check for collision — add milliseconds if needed
    try {
      await head(filename);
      const ms = String(new Date().getMilliseconds()).padStart(3,'0');
      id = id + ms;
      filename = `${id}.html`;
    } catch {
      // No collision, proceed
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

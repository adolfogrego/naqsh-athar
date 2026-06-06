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
  if (typeof html !== 'string') return false;
  const sizeKB = Buffer.byteLength(html, 'utf8') / 1024;
  if (sizeKB > 1024) return false;
  if (!html.includes('<!DOCTYPE html>')) return false;
  if (!html.includes('</html>')) return false;
  // Must contain Naqsh-Athar structural markers
  const required = ['naqsh-athar', 'arabic-title', 'portada-circle',
                    'activar-slide', 'dl-btn-html', 'نقش أثر'];
  for (const marker of required) {
    if (!html.includes(marker)) return false;
  }
  // Only block truly malicious patterns (not CDN scripts)
  const forbidden = ['eval(', 'document.cookie'];
  for (const pattern of forbidden) {
    if (html.includes(pattern)) return false;
  }
  return true;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { html } = req.body;
    if (!validateHtml(html)) {
      return res.status(400).json({ error: 'Contenido inválido' });
    }

    let id = generateId();
    let filename = `${id}.html`;

    try {
      await head(filename);
      const ms = String(new Date().getMilliseconds()).padStart(3,'0');
      id = id + ms;
      filename = `${id}.html`;
    } catch { /* no collision */ }

    await put(filename, html, {
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

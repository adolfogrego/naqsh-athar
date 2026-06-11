import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '400kb',
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

function validatePayload(photo, origin) {
  if (typeof photo !== 'string')
    return { ok: false, reason: 'photo not a string' };
  if (!photo.startsWith('data:image/jpeg;base64,'))
    return { ok: false, reason: 'photo must be JPEG data URL' };
  const sizeKB = Buffer.byteLength(photo, 'utf8') / 1024;
  console.log(`photo size: ${sizeKB.toFixed(1)}KB`);
  if (sizeKB > 300)
    return { ok: false, reason: `photo too large: ${sizeKB.toFixed(0)}KB (max 300KB)` };
  if (typeof origin !== 'string')
    return { ok: false, reason: 'origin not a string' };
  if (!/^https?:\/\//.test(origin))
    return { ok: false, reason: 'origin must be a URL' };
  return { ok: true };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { photo, origin } = req.body;
    console.log('guardar called, origin:', origin);

    const validation = validatePayload(photo, origin);
    if (!validation.ok) {
      console.error('Validation failed:', validation.reason);
      return res.status(400).json({ error: 'Contenido inválido', reason: validation.reason });
    }

    const id = generateId();
    const portalUrl = `https://naqsh-athar.link/${id}`;

    const payload = JSON.stringify({ photo, origin, portalUrl });
    console.log(`saving ${id}.json (${(payload.length/1024).toFixed(1)}KB)`);

    await put(`${id}.json`, payload, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    console.log(`saved OK: ${portalUrl}`);
    return res.status(200).json({ url: portalUrl, id });

  } catch (err) {
    console.error('guardar error:', err);
    return res.status(500).json({ error: 'Error al guardar', detail: err.message });
  }
}

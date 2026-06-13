import { list } from '@vercel/blob';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import QRCode from 'qrcode';

// ── Constants ─────────────────────────────────────────────────────────────────
const OG_W = 1200;
const OG_H = 630;

// ── Seedable random ───────────────────────────────────────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── QR matrix builder ─────────────────────────────────────────────────────────
function buildQRMatrix(url) {
  return QRCode.create(url, { errorCorrectionLevel: 'H' });
}

// ── Radial fade ───────────────────────────────────────────────────────────────
function applyRadialFade(ctx, cx, cy, R, fadeStart) {
  const innerR = R * fadeStart;
  const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, R);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, OG_W, OG_H);
  ctx.globalCompositeOperation = 'source-over';
}

// ── Arabic text image overlay ─────────────────────────────────────────────────
async function drawArabic(ctx, cx, cy, R) {
  try {
    const arabicImg = await loadImage('https://naqsh-athar.link/arabic-text.png');
    const targetW = R * 1.1;
    const scale = targetW / arabicImg.width;
    const w = arabicImg.width * scale;
    const h = arabicImg.height * scale;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(arabicImg, cx - w / 2, cy - h / 2, w, h);
    ctx.restore();
  } catch(e) {
    console.warn('arabic-text.png load failed:', e.message);
  }
}

// ── Parchment background ──────────────────────────────────────────────────────
function drawBackground(ctx) {
  ctx.fillStyle = '#f5f0e8';
  ctx.fillRect(0, 0, OG_W, OG_H);
  const grad = ctx.createRadialGradient(OG_W/2, OG_H/2, 0, OG_W/2, OG_H/2, OG_W * 0.7);
  grad.addColorStop(0, 'rgba(236,229,214,0.6)');
  grad.addColorStop(1, 'rgba(196,184,150,0.3)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, OG_W, OG_H);
}

// ── Circle with photo (OG mode, no QR) ───────────────────────────────────────
async function drawCircle(ctx, photoDataUrl, cx, cy, R) {
  const photoImg = await loadImage(Buffer.from(photoDataUrl.split(',')[1], 'base64'));

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();
  const scale = Math.max((R * 2) / photoImg.width, (R * 2) / photoImg.height);
  const w = photoImg.width * scale;
  const h = photoImg.height * scale;
  ctx.drawImage(photoImg, cx - w / 2, cy - h / 2, w, h);
  ctx.fillStyle = 'rgba(245,240,232,0.18)';
  ctx.fill();
  ctx.restore();

  applyRadialFade(ctx, cx, cy, R, 0.82);

  // Restore parchment behind fade edge
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = '#f5f0e8';
  ctx.fillRect(0, 0, OG_W, OG_H);
  ctx.restore();

  // Border
  ctx.beginPath();
  ctx.arc(cx, cy, R - 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(26,16,8,0.35)';
  ctx.lineWidth = 3;
  ctx.stroke();

  await drawArabic(ctx, cx, cy, R);
}

// ── Orante parchment fallback (when blob unavailable) ────────────────────────
async function drawOranteFallback(ctx, cx, cy, R) {
  const grad = ctx.createRadialGradient(cx, cy * 0.9, 20, cx, cy, R);
  grad.addColorStop(0, '#ece5d6');
  grad.addColorStop(0.7, '#d8cdb4');
  grad.addColorStop(1, '#c4b896');
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, R - 8, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(90,62,40,0.18)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, R - 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(26,16,8,0.4)';
  ctx.lineWidth = 3;
  ctx.stroke();

  await drawArabic(ctx, cx, cy, R);
}

// ── Photo with QR (download mode, 400×400) ────────────────────────────────────
async function renderPhotoWithQR(ctx, photoDataUrl, portalUrl) {
  const SIZE = 400;
  const R = SIZE / 2;
  const BW = 3;
  const r_inner = R - BW - 1;

  ctx.clearRect(0, 0, SIZE, SIZE);

  const photoImg = await loadImage(Buffer.from(photoDataUrl.split(',')[1], 'base64'));
  ctx.save();
  ctx.beginPath();
  ctx.arc(R, R, R, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(photoImg, 0, 0, SIZE, SIZE);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(R, R, R, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(245,240,232,0.72)';
  ctx.fill();
  ctx.restore();

  const qrData = buildQRMatrix(portalUrl);
  const modules = qrData.modules;
  const n = modules.size;
  const QS = SIZE * 0.76;
  const cell = QS / n;
  const off = (SIZE - QS) / 2;
  const dot_r = cell * 0.38;
  const INK = 'rgba(26,16,8,0.12)';

  function inFinder(r, c) {
    return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  }

  const finders = [
    [off + 3.5 * cell,       off + 3.5 * cell],
    [off + (n - 3.5) * cell, off + 3.5 * cell],
    [off + 3.5 * cell,       off + (n - 3.5) * cell],
  ];

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (inFinder(row, col)) continue;
      if (!modules.get(row, col)) continue;
      const cx = off + col * cell + cell / 2;
      const cy = off + row * cell + cell / 2;
      if (Math.hypot(cx - R, cy - R) + dot_r > r_inner) continue;
      ctx.beginPath();
      ctx.arc(cx, cy, dot_r, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
    }
  }

  const rng = mulberry32(42);
  const extra = Math.ceil((R - off) / cell) + 2;
  for (let row = -extra; row < n + extra; row++) {
    for (let col = -extra; col < n + extra; col++) {
      const cx = off + col * cell + cell / 2;
      const cy = off + row * cell + cell / 2;
      if (Math.hypot(cx - R, cy - R) + dot_r > r_inner) continue;
      if (cx >= off && cx <= off + QS && cy >= off && cy <= off + QS) continue;
      if (rng() < 0.45) {
        ctx.beginPath();
        ctx.arc(cx, cy, dot_r, 0, Math.PI * 2);
        ctx.fillStyle = INK;
        ctx.fill();
      }
    }
  }

  for (const [fx, fy] of finders) {
    const ro = cell * 3.5, rg = cell * 2.5, ri = cell * 1.5;
    if (Math.hypot(fx - R, fy - R) + ro > r_inner + ro * 0.3) continue;
    ctx.beginPath(); ctx.arc(fx, fy, ro, 0, Math.PI * 2);
    ctx.fillStyle = INK; ctx.fill();
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.arc(fx, fy, rg, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,1)'; ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(fx, fy, ri, 0, Math.PI * 2);
    ctx.fillStyle = INK; ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(R, R, R - BW / 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(26,16,8,0.5)';
  ctx.lineWidth = BW;
  ctx.stroke();

  // Arabic overlay for download image (400×400)
  try {
    const arabicImg = await loadImage('https://naqsh-athar.link/arabic-text.png');
    const targetW = R * 1.1;
    const scale = targetW / arabicImg.width;
    const w = arabicImg.width * scale;
    const h = arabicImg.height * scale;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(arabicImg, R - w / 2, R - h / 2, w, h);
    ctx.restore();
  } catch(e) {
    console.warn('arabic-text.png load failed in QR mode:', e.message);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export const config = { api: { responseLimit: '2mb' } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { id, mode } = req.query;

  try {
    // ── Cases 1 & 2: OG image (1200×630) ─────────────────────────────────────
    if (!id || mode === 'og') {
      const canvas = createCanvas(OG_W, OG_H);
      const ctx = canvas.getContext('2d');
      const R = Math.round(OG_H * 0.44);
      const cx = OG_W / 2;
      const cy = OG_H / 2;

      drawBackground(ctx);

      if (!id) {
        // Case 1: base URL → Orante from blob
        let drew = false;
        try {
          const { blobs } = await list({ prefix: 'orante.json' });
          const oranteBlob = blobs.find(b => b.pathname === 'orante.json');
          if (oranteBlob) {
            const oranteRes = await fetch(oranteBlob.url);
            if (oranteRes.ok) {
              const oranteData = await oranteRes.json();
              if (oranteData.photo) {
                await drawCircle(ctx, oranteData.photo, cx, cy, R);
                drew = true;
              }
            }
          }
        } catch(e) {
          console.warn('orante.json fetch failed:', e.message);
        }
        if (!drew) await drawOranteFallback(ctx, cx, cy, R);

      } else {
        // Case 2: timestamp URL, mode=og → user photo clean
        if (!/^\d{12}(\d{3})?$/.test(id)) {
          return res.status(400).json({ error: 'invalid id' });
        }
        const { blobs } = await list({ prefix: `${id}.json` });
        const blob = blobs.find(b => b.pathname === `${id}.json`);
        if (!blob) return res.status(404).json({ error: 'not found' });
        const blobRes = await fetch(blob.url);
        if (!blobRes.ok) return res.status(502).json({ error: 'blob fetch failed' });
        const data = await blobRes.json();
        await drawCircle(ctx, data.photo, cx, cy, R);
      }

      const png = canvas.toBuffer('image/png');
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Content-Length', png.length);
      return res.status(200).send(png);
    }

    // ── Case 3: Download mode → photo + QR (400×400) ──────────────────────────
    if (!/^\d{12}(\d{3})?$/.test(id)) {
      return res.status(400).json({ error: 'invalid id' });
    }

    const { blobs } = await list({ prefix: `${id}.json` });
    const blob = blobs.find(b => b.pathname === `${id}.json`);
    if (!blob) return res.status(404).json({ error: 'not found' });
    const blobRes = await fetch(blob.url);
    if (!blobRes.ok) return res.status(502).json({ error: 'blob fetch failed' });
    const data = await blobRes.json();

    const canvas400 = createCanvas(400, 400);
    const ctx400 = canvas400.getContext('2d');
    await renderPhotoWithQR(ctx400, data.photo, data.portalUrl || `https://naqsh-athar.link/${id}`);

    const png = canvas400.toBuffer('image/png');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Length', png.length);
    return res.status(200).send(png);

  } catch (err) {
    console.error('og error:', err);
    return res.status(500).json({ error: err.message });
  }
}

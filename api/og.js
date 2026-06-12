import { list } from '@vercel/blob';
import { createCanvas, loadImage, registerFont } from '@napi-rs/canvas';

// Seedable random — same seed produces same fill pattern as the browser
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Minimal QR encoder — uses qrcode-generator logic ported to Node
// We vendor a tiny version inline to avoid browser-only globals
function buildQRMatrix(url) {
  // Use the 'qrcode' npm package (pure JS, works in Node)
  // Installed as dependency
  const QRCode = require('qrcode');
  // getMatrix returns a 2D boolean array
  return QRCode.create(url, { errorCorrectionLevel: 'H' });
}

export const config = { api: { responseLimit: '2mb' } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { id } = req.query;
  if (!id || !/^\d{12}(\d{3})?$/.test(id)) {
    return res.status(400).json({ error: 'invalid id' });
  }

  try {
    // 1. Fetch photo from blob
    const { blobs } = await list({ prefix: `${id}.json` });
    const blob = blobs.find(b => b.pathname === `${id}.json`);
    if (!blob) return res.status(404).json({ error: 'not found' });

    const blobRes = await fetch(blob.url);
    if (!blobRes.ok) return res.status(502).json({ error: 'blob fetch failed' });
    const data = await blobRes.json();

    const portalUrl = data.portalUrl || `https://naqsh-athar.link/${id}`;
    const photoDataUrl = data.photo; // JPEG base64

    // 2. Build QR matrix
    const qrData = buildQRMatrix(portalUrl);
    const modules = qrData.modules;
    const n = modules.size;

    // 3. Render on canvas — mode 'screen'
    const SIZE = 400;
    const canvas = createCanvas(SIZE, SIZE);
    const ctx = canvas.getContext('2d');
    const R = SIZE / 2;
    const BW = 3;
    const r_inner = R - BW - 1;

    // Photo background
    const photoImg = await loadImage(Buffer.from(photoDataUrl.split(',')[1], 'base64'));
    ctx.save();
    ctx.beginPath();
    ctx.arc(R, R, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(photoImg, 0, 0, SIZE, SIZE);
    ctx.restore();

    // Parchment overlay (screen mode)
    ctx.save();
    ctx.beginPath();
    ctx.arc(R, R, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(245,240,232,0.72)';
    ctx.fill();
    ctx.restore();

    // QR matrix
    const QS = SIZE * 0.76;
    const cell = QS / n;
    const off = (SIZE - QS) / 2;
    const dot_r = cell * 0.38;
    const dotOpacity = 0.12; // screen mode
    const INK = `rgba(26,16,8,${dotOpacity})`;

    function inFinder(r, c) {
      return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
    }

    const finders = [
      [off + 3.5 * cell, off + 3.5 * cell],
      [off + (n - 3.5) * cell, off + 3.5 * cell],
      [off + 3.5 * cell, off + (n - 3.5) * cell],
    ];

    // Data dots
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

    // Fill dots outside QR square but inside circle
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

    // Finder patterns
    for (const [fx, fy] of finders) {
      const ro = cell * 3.5, rg = cell * 2.5, ri = cell * 1.5;
      if (Math.hypot(fx - R, fy - R) + ro > r_inner + ro * 0.3) continue;
      ctx.beginPath(); ctx.arc(fx, fy, ro, 0, Math.PI * 2);
      ctx.fillStyle = INK; ctx.fill();
      // Gap
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(fx, fy, rg, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,1)'; ctx.fill();
      ctx.restore();
      ctx.beginPath(); ctx.arc(fx, fy, ri, 0, Math.PI * 2);
      ctx.fillStyle = INK; ctx.fill();
    }

    // Outer border
    ctx.beginPath();
    ctx.arc(R, R, R - BW / 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(26,16,8,0.5)';
    ctx.lineWidth = BW;
    ctx.stroke();

    // Arabic text (Amiri not available on server — use fallback serif)
    ctx.save();
    ctx.font = 'bold 52px serif';
    ctx.fillStyle = '#1a1008';
    ctx.globalAlpha = 0.85;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u0646\u0642\u0634 \u0623\u062b\u0631', R, R);
    ctx.restore();

    // 4. Return PNG
    const png = canvas.toBuffer('image/png');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Length', png.length);
    return res.status(200).send(png);

  } catch (err) {
    console.error('og error:', err);
    return res.status(500).json({ error: err.message });
  }
}

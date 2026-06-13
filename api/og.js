import { list } from '@vercel/blob';
import { createCanvas, loadImage } from '@napi-rs/canvas';

// ── Arabic text overlay ───────────────────────────────────────────────────────
const ARABIC = '\u0646\u0642\u0634 \u0623\u062b\u0631';

// ── Seedable random (same fill pattern as browser) ───────────────────────────
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
  const QRCode = require('qrcode');
  return QRCode.create(url, { errorCorrectionLevel: 'H' });
}

// ── Radial fade ───────────────────────────────────────────────────────────────
function applyRadialFade(ctx, R, fadeStart) {
  const S = R * 2;
  const innerR = R * fadeStart;
  const grad = ctx.createRadialGradient(R, R, innerR, R, R, R);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);
  ctx.globalCompositeOperation = 'source-over';
}

// ── Arabic text centered on circle ───────────────────────────────────────────
function drawArabic(ctx, R) {
  ctx.save();
  ctx.font = 'bold 55px serif';
  ctx.fillStyle = 'rgba(26,16,8,0.75)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  ctx.fillText(ARABIC, R, R);
  ctx.restore();
}

// ── Orante parchment circle (fallback when no blob) ───────────────────────────
function renderOrante(ctx, SIZE) {
  const R = SIZE / 2;
  ctx.clearRect(0, 0, SIZE, SIZE);

  // Solid parchment background (no transparency)
  ctx.beginPath();
  ctx.arc(R, R, R, 0, Math.PI * 2);
  ctx.fillStyle = '#f5f0e8';
  ctx.fill();

  const grad = ctx.createRadialGradient(R, R * 0.85, 20, R, R, R);
  grad.addColorStop(0, '#ece5d6');
  grad.addColorStop(0.7, '#d8cdb4');
  grad.addColorStop(1, '#c4b896');
  ctx.beginPath();
  ctx.arc(R, R, R, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(R, R, R - 8, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(90,62,40,0.18)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(R, R, R - 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(26,16,8,0.4)';
  ctx.lineWidth = 3;
  ctx.stroke();

  drawArabic(ctx, R);
}

// ── Photo circle (clean, no QR) — for OG mode ────────────────────────────────
async function renderPhotoClean(ctx, photoDataUrl, SIZE) {
  const R = SIZE / 2;
  ctx.clearRect(0, 0, SIZE, SIZE);

  // Solid parchment background — prevents transparency issues in OG scrapers
  ctx.beginPath();
  ctx.arc(R, R, R, 0, Math.PI * 2);
  ctx.fillStyle = '#f5f0e8';
  ctx.fill();

  const photoImg = await loadImage(Buffer.from(photoDataUrl.split(',')[1], 'base64'));

  ctx.save();
  ctx.beginPath();
  ctx.arc(R, R, R, 0, Math.PI * 2);
  ctx.clip();
  const scale = Math.max(SIZE / photoImg.width, SIZE / photoImg.height);
  const w = photoImg.width * scale;
  const h = photoImg.height * scale;
  ctx.drawImage(photoImg, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
  ctx.fillStyle = 'rgba(245,240,232,0.22)';
  ctx.fill();
  ctx.restore();

  applyRadialFade(ctx, R, 0.82);

  // Redraw background behind fade edge
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  ctx.beginPath();
  ctx.arc(R, R, R, 0, Math.PI * 2);
  ctx.fillStyle = '#f5f0e8';
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(R, R, R - 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(26,16,8,0.4)';
  ctx.lineWidth = 3;
  ctx.stroke();

  drawArabic(ctx, R);
}

// ── Photo circle with QR — for download mode ─────────────────────────────────
async function renderPhotoWithQR(ctx, photoDataUrl, portalUrl, SIZE) {
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
  const dotOpacity = 0.12;
  const INK = `rgba(26,16,8,${dotOpacity})`;

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

  drawArabic(ctx, R);
}

// ── Main handler ──────────────────────────────────────────────────────────────
export const config = { api: { responseLimit: '2mb' } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { id, mode } = req.query;
  const SIZE = 400;
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');

  try {
    // ── Case 1: No ID → Orante (base URL) ───────────────────────────────────
    if (!id) {
      try {
        const { blobs } = await list({ prefix: 'orante.json' });
        const oranteBlob = blobs.find(b => b.pathname === 'orante.json');
        if (oranteBlob) {
          const oranteRes = await fetch(oranteBlob.url);
          if (oranteRes.ok) {
            const oranteData = await oranteRes.json();
            if (oranteData.photo) {
              await renderPhotoClean(ctx, oranteData.photo, SIZE);
              const png = canvas.toBuffer('image/png');
              res.setHeader('Content-Type', 'image/png');
              res.setHeader('Cache-Control', 'public, max-age=86400');
              res.setHeader('Content-Length', png.length);
              return res.status(200).send(png);
            }
          }
        }
      } catch(e) {
        console.warn('orante.json fetch failed, falling back:', e.message);
      }
      // Fallback: generated parchment
      renderOrante(ctx, SIZE);
      const png = canvas.toBuffer('image/png');
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Content-Length', png.length);
      return res.status(200).send(png);
    }

    // ── Validate ID ──────────────────────────────────────────────────────────
    if (!/^\d{12}(\d{3})?$/.test(id)) {
      return res.status(400).json({ error: 'invalid id' });
    }

    // ── Fetch photo from blob ─────────────────────────────────────────────────
    const { blobs } = await list({ prefix: `${id}.json` });
    const blob = blobs.find(b => b.pathname === `${id}.json`);
    if (!blob) return res.status(404).json({ error: 'not found' });

    const blobRes = await fetch(blob.url);
    if (!blobRes.ok) return res.status(502).json({ error: 'blob fetch failed' });
    const data = await blobRes.json();

    const portalUrl    = data.portalUrl || `https://naqsh-athar.link/${id}`;
    const photoDataUrl = data.photo;

    // ── Case 2: OG mode → photo clean + arabic ───────────────────────────────
    if (mode === 'og') {
      await renderPhotoClean(ctx, photoDataUrl, SIZE);
    } else {
      // ── Case 3: Download mode → photo + QR + arabic ──────────────────────
      await renderPhotoWithQR(ctx, photoDataUrl, portalUrl, SIZE);
    }

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
